"use client";

import { io, type Socket } from "socket.io-client";

export type CallRole = "caller" | "callee";

export interface VideoCallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onStatusChange?: (status: "connecting" | "connected" | "ended" | "failed") => void;
  onSlotLocked?: (bookingId: string) => void;
  onSlotUnlocked?: (bookingId: string) => void;
  onPeerJoined?: () => void;
  onPeerLeft?: () => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...(process.env.NEXT_PUBLIC_TURN_SERVER ? [{
    urls: process.env.NEXT_PUBLIC_TURN_SERVER,
    username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
    credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
  }] : []),
];

export class VideoCallManager {
  private socket: Socket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private events: VideoCallEvents = {};
  private currentBookingId: string | null = null;
  private currentRole: CallRole | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private tokenPromise: Promise<string> | null = null;

  constructor(events: VideoCallEvents = {}) {
    this.events = events;
  }

  async start(bookingId?: string) {
    if (typeof window === "undefined") return;
    const token = await this.getToken();
    const signalUrl = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "https://ws.nurturee.in";
    this.socket = io(signalUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    this.socket.on("connect", () => {
      // Join the lobby room for this booking (waiting room)
      if (bookingId) {
        this.socket!.emit("join-room", {
          roomId: `lobby_${bookingId}`,
          role: "customer",
          bookingId,
        });
      }
    });

    // Doctor locked our slot — notify UI
    this.socket.on("slot-locked", (data: { bookingId: string; from: string }) => {
      this.events.onSlotLocked?.(data.bookingId);
      window.dispatchEvent(new CustomEvent("nurturee-signal", {
        detail: { kind: "lock-slot", bookingId: data.bookingId, from: data.from },
      }));
    });

    this.socket.on("slot-unlocked", (data: { bookingId: string; from: string }) => {
      this.events.onSlotUnlocked?.(data.bookingId);
      window.dispatchEvent(new CustomEvent("nurturee-signal", {
        detail: { kind: "unlock-slot", bookingId: data.bookingId, from: data.from },
      }));
    });

    // Doctor admitted us from lobby to consultation room
    this.socket.on("admitted", (data: { bookingId: string; callRoom: string }) => {
      this.joinCallRoom(data.callRoom, data.bookingId);
    });

    // WebRTC signal relay from the other person in the room
    this.socket.on("signal", (data: { from: string; kind: string; payload: unknown }) => {
      this.handleSignal(data);
    });

    // Peer events
    this.socket.on("peer-joined", () => {
      this.events.onPeerJoined?.();
    });

    this.socket.on("peer-left", () => {
      this.events.onPeerLeft?.();
      this.events.onStatusChange?.("ended");
      window.dispatchEvent(new CustomEvent("nurturee-signal", {
        detail: { kind: "call-ended", bookingId: this.currentBookingId },
      }));
      this.cleanupCall();
    });

    this.socket.on("connect_error", (err: Error) => {
      console.error("[vcm] socket connect error:", err.message);
    });
  }

  // Join the actual consultation room (called after "admitted" from lobby)
  joinCallRoom(roomId: string, bookingId: string) {
    if (!this.socket) return;
    this.currentBookingId = bookingId;
    this.socket.emit("join-room", { roomId, role: "customer", bookingId });
  }

  private async getToken(): Promise<string> {
    if (this.tokenPromise) return this.tokenPromise;
    this.tokenPromise = fetch("/api/signal-token").then(r => {
      if (!r.ok) throw new Error(`signal-token HTTP ${r.status}`);
      return r.json();
    }).then(data => data.token);
    return this.tokenPromise;
  }

  private async handleSignal(data: { from: string; kind: string; payload: unknown }) {
    const { kind, payload } = data;
    switch (kind) {
      case "call-offer": {
        this.currentRole = "callee";
        window.dispatchEvent(new CustomEvent("nurturee-signal", {
          detail: { kind: "incoming-call", bookingId: this.currentBookingId, from: data.from, sdp: payload },
        }));
        break;
      }
      case "call-answer": {
        if (this.pc && this.currentRole === "caller") {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
            for (const c of this.pendingCandidates) {
              try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
            }
            this.pendingCandidates = [];
          } catch (err) { console.error("setRemoteDescription error:", err); }
        }
        break;
      }
      case "ice": {
        if (this.pc) {
          try {
            if (this.currentRole === "caller" && !this.pc.remoteDescription) {
              this.pendingCandidates.push(payload as RTCIceCandidateInit);
            } else {
              await this.pc.addIceCandidate(new RTCIceCandidate(payload as RTCIceCandidateInit));
            }
          } catch {}
        }
        break;
      }
      case "call-end": {
        this.events.onStatusChange?.("ended");
        window.dispatchEvent(new CustomEvent("nurturee-signal", {
          detail: { kind: "call-ended", bookingId: this.currentBookingId },
        }));
        this.cleanupCall();
        break;
      }
      case "call-rejected": {
        this.events.onStatusChange?.("ended");
        window.dispatchEvent(new CustomEvent("nurturee-signal", {
          detail: { kind: "call-rejected", bookingId: this.currentBookingId },
        }));
        this.cleanupCall();
        break;
      }
    }
  }

  // Doctor (caller) starts the call
  async startCall(bookingId: string): Promise<void> {
    this.currentBookingId = bookingId;
    this.currentRole = "caller";
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.events.onLocalStream?.(this.localStream);
      this.pc = this.createPeerConnection();
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
      this.events.onStatusChange?.("connecting");
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      // Send to everyone in the room (the doctor)
      this.socket?.emit("signal", { kind: "call-offer", payload: offer });
    } catch (err) {
      console.error("startCall failed:", err);
      this.events.onStatusChange?.("failed");
      this.cleanupCall();
      throw err;
    }
  }

  // Customer (callee) accepts the call
  async acceptCall(bookingId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    this.currentBookingId = bookingId;
    this.currentRole = "callee";
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.events.onLocalStream?.(this.localStream);
      this.pc = this.createPeerConnection();
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket?.emit("signal", { kind: "call-answer", payload: answer });
      this.events.onStatusChange?.("connecting");
    } catch (err) {
      console.error("acceptCall failed:", err);
      this.events.onStatusChange?.("failed");
      this.cleanupCall();
      throw err;
    }
  }

  // Room-based: lock/unlock slot (emits to lobby room)
  lockSlot(bookingId: string): void {
    this.socket?.emit("lock-slot", { bookingId });
  }

  unlockSlot(bookingId: string): void {
    this.socket?.emit("unlock-slot", { bookingId });
  }

  rejectCall(): void {
    this.socket?.emit("signal", { kind: "call-rejected" });
    this.cleanupCall();
  }

  endCall(): void {
    this.socket?.emit("signal", { kind: "call-end" });
    this.cleanupCall();
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audio = this.localStream.getAudioTracks()[0];
    if (audio) { audio.enabled = !audio.enabled; return !audio.enabled; }
    return false;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;
    const video = this.localStream.getVideoTracks()[0];
    if (video) { video.enabled = !video.enabled; return !video.enabled; }
    return false;
  }

  private createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = (e) => {
      this.remoteStream = e.streams[0];
      this.events.onRemoteStream?.(this.remoteStream);
      this.events.onStatusChange?.("connected");
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket?.emit("signal", { kind: "ice", payload: e.candidate.toJSON() });
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        this.events.onStatusChange?.("failed");
      }
    };
    return pc;
  }

  private cleanupCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
    this.currentBookingId = null;
    this.currentRole = null;
    this.pendingCandidates = [];
  }

  stop() {
    this.endCall();
    this.socket?.disconnect();
    this.socket = null;
  }
}
