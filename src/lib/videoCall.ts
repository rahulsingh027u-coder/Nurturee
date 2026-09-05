"use client";

import { io, type Socket } from "socket.io-client";

export type CallRole = "caller" | "callee";

export interface VideoCallEvents {
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onStatusChange?: (status: "connecting" | "connected" | "ended" | "failed") => void;
  onIceConnectionChange?: (state: RTCIceConnectionState) => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export class VideoCallManager {
  readonly peerId: string;
  private socket: Socket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private events: VideoCallEvents = {};
  private currentBookingId: string | null = null;
  private currentRole: CallRole | null = null;
  private remotePeerId: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private tokenPromise: Promise<string> | null = null;

  constructor(events: VideoCallEvents = {}) {
    this.peerId = `peer-${Math.random().toString(36).slice(2, 10)}`;
    this.events = events;
  }

  async start() {
    if (typeof window === "undefined") return;
    const token = await this.getToken();
    const signalUrl = process.env.NEXT_PUBLIC_SIGNAL_URL ?? "https://ws.nurturee.in";
    this.socket = io(signalUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    this.socket.on("connect", () => {
      this.socket!.emit("register", { peerId: this.peerId, role: "customer" });
    });

    this.socket.on("signal", (data: { from: string; kind: string; payload: unknown }) => {
      this.handleSignal(data);
    });

    this.socket.on("slot-locked", (data: { bookingId: string; from: string }) => {
      window.dispatchEvent(new CustomEvent("nurturee-signal", {
        detail: { kind: "lock-slot", bookingId: data.bookingId, from: data.from },
      }));
    });

    this.socket.on("slot-unlocked", (data: { bookingId: string; from: string }) => {
      window.dispatchEvent(new CustomEvent("nurturee-signal", {
        detail: { kind: "unlock-slot", bookingId: data.bookingId, from: data.from },
      }));
    });

    this.socket.on("peer-offline", (data: { peerId: string }) => {
      if (this.remotePeerId === data.peerId) {
        this.events.onStatusChange?.("ended");
        window.dispatchEvent(new CustomEvent("nurturee-signal", {
          detail: { kind: "call-ended", bookingId: this.currentBookingId },
        }));
        this.cleanupCall();
      }
    });

    this.socket.on("connect_error", (err: Error) => {
      console.error("[vcm] socket connect error:", err.message);
    });
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
    const { from, kind, payload } = data;
    switch (kind) {
      case "call-offer": {
        this.currentRole = "callee";
        this.remotePeerId = from;
        const sdp = payload as RTCSessionDescriptionInit;
        const bookingId = (sdp as { bookingId?: string })?.bookingId ?? null;
        this.currentBookingId = bookingId;
        window.dispatchEvent(new CustomEvent("nurturee-signal", {
          detail: { kind: "incoming-call", bookingId, from, sdp },
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

  async startCall(bookingId: string, remotePeerId: string): Promise<void> {
    this.currentBookingId = bookingId;
    this.currentRole = "caller";
    this.remotePeerId = remotePeerId;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.events.onLocalStream?.(this.localStream);
      this.pc = this.createPeerConnection();
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
      this.events.onStatusChange?.("connecting");
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.socket?.emit("signal", { to: remotePeerId, kind: "call-offer", payload: offer });
    } catch (err) {
      console.error("startCall failed:", err);
      this.events.onStatusChange?.("failed");
      this.cleanupCall();
      throw err;
    }
  }

  lockSlot(bookingId: string, toPeerId: string) {
    this.socket?.emit("lock-slot", { bookingId, toPeerId });
  }

  unlockSlot(bookingId: string, toPeerId: string) {
    this.socket?.emit("unlock-slot", { bookingId, toPeerId });
  }

  async acceptCall(bookingId: string, remotePeerId: string, offerSdp: RTCSessionDescriptionInit): Promise<void> {
    this.currentBookingId = bookingId;
    this.currentRole = "callee";
    this.remotePeerId = remotePeerId;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.events.onLocalStream?.(this.localStream);
      this.pc = this.createPeerConnection();
      this.localStream.getTracks().forEach((t) => this.pc!.addTrack(t, this.localStream!));
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket?.emit("signal", { to: remotePeerId, kind: "call-answer", payload: answer });
      this.events.onStatusChange?.("connecting");
    } catch (err) {
      console.error("acceptCall failed:", err);
      this.events.onStatusChange?.("failed");
      this.cleanupCall();
      throw err;
    }
  }

  rejectCall(bookingId: string, remotePeerId: string): void {
    this.socket?.emit("signal", { to: remotePeerId, kind: "call-rejected" });
    this.cleanupCall();
  }

  endCall(): void {
    if (this.currentBookingId && this.remotePeerId) {
      this.socket?.emit("signal", { to: this.remotePeerId, kind: "call-end" });
    }
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
      if (e.candidate && this.remotePeerId) {
        this.socket?.emit("signal", { to: this.remotePeerId, kind: "ice", payload: e.candidate.toJSON() });
      }
    };
    pc.oniceconnectionstatechange = () => {
      this.events.onIceConnectionChange?.(pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") this.events.onStatusChange?.("failed");
    };
    return pc;
  }

  private cleanupCall(): void {
    if (this.localStream) { this.localStream.getTracks().forEach((t) => t.stop()); this.localStream = null; }
    if (this.pc) { this.pc.close(); this.pc = null; }
    this.remoteStream = null;
    this.currentBookingId = null;
    this.currentRole = null;
    this.remotePeerId = null;
    this.pendingCandidates = [];
  }

  stop() { this.endCall(); this.socket?.disconnect(); this.socket = null; }
}
