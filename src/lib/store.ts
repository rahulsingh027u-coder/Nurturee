"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppView, Booking, CustomerDocument, Service } from "./types";
import { CAREGIVERS } from "./data";

interface BookingDraftAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  landmark?: string;
}

interface BookingDraft {
  service: Service | null;
  mode: "physical" | "online" | null;
  date: string | null; // ISO yyyy-mm-dd
  timeSlot: string | null;
  address: BookingDraftAddress | null;
  notes: string;
}

interface AppState {
  // Navigation
  view: AppView;
  setView: (v: AppView) => void;

  // Booking draft (in-progress booking modal state)
  bookingDraft: BookingDraft;
  isBookingOpen: boolean;
  /** Increments each time openBooking is called — used as React key to reset modal state cleanly. */
  bookingSessionId: number;
  openBooking: (service: Service) => void;
  closeBooking: () => void;
  setDraftMode: (m: "physical" | "online") => void;
  setDraftDate: (d: string) => void;
  setDraftTime: (t: string) => void;
  setDraftAddress: (a: BookingDraftAddress) => void;
  setDraftNotes: (n: string) => void;
  resetDraft: () => void;
  confirmBooking: () => string | null; // returns booking id or null

  // Persisted bookings
  bookings: Booking[];
  cancelBooking: (id: string) => void;

  // Caregiver currently being viewed (post-assignment detail)
  activeCaregiverId: string | null;
  viewCaregiver: (caregiverId: string) => void;

  // Customer documents (prescriptions / reports)
  documents: CustomerDocument[];
  addDocument: (doc: CustomerDocument) => void;
  deleteDocument: (id: string) => void;

  // Toast helper (simple bridge — uses window event)
  toast: (msg: string, type?: "default" | "success" | "error") => void;
}

const emptyDraft: BookingDraft = {
  service: null,
  mode: null,
  date: null,
  timeSlot: null,
  address: null,
  notes: "",
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: "home",
      setView: (v) => {
        set({ view: v });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "auto" });
        }
      },

      bookingDraft: emptyDraft,
      isBookingOpen: false,
      bookingSessionId: 0,
      openBooking: (service) => {
        const defaultMode: "physical" | "online" =
          service.mode === "online" ? "online" : "physical";
        set((s) => ({
          bookingDraft: {
            ...emptyDraft,
            service,
            mode: service.mode === "both" ? defaultMode : defaultMode,
          },
          isBookingOpen: true,
          bookingSessionId: s.bookingSessionId + 1,
        }));
      },
      closeBooking: () => set({ isBookingOpen: false }),
      setDraftMode: (m) =>
        set((s) => ({ bookingDraft: { ...s.bookingDraft, mode: m } })),
      setDraftDate: (d) =>
        set((s) => ({ bookingDraft: { ...s.bookingDraft, date: d } })),
      setDraftTime: (t) =>
        set((s) => ({ bookingDraft: { ...s.bookingDraft, timeSlot: t } })),
      setDraftAddress: (a) =>
        set((s) => ({ bookingDraft: { ...s.bookingDraft, address: a } })),
      setDraftNotes: (n) =>
        set((s) => ({ bookingDraft: { ...s.bookingDraft, notes: n } })),
      resetDraft: () => set({ bookingDraft: emptyDraft }),

      confirmBooking: () => {
        const draft = get().bookingDraft;
        if (!draft.service || !draft.mode || !draft.date || !draft.timeSlot)
          return null;
        if (draft.mode === "physical" && !draft.address) return null;

        // Simulate admin assigning an approved caregiver based on category
        const candidates = CAREGIVERS.filter((c) => {
          if (draft.service!.category === "doctor") {
            return c.id.startsWith("cg-006") || c.specialization.toLowerCase().includes("gynae");
          }
          if (draft.service!.category === "eldercare") {
            return (
              c.specialization.toLowerCase().includes("elder") ||
              c.specialization.toLowerCase().includes("dementia")
            );
          }
          // childcare / nanny
          return (
            c.specialization.toLowerCase().includes("newborn") ||
            c.specialization.toLowerCase().includes("nanny") ||
            c.specialization.toLowerCase().includes("postnatal") ||
            c.specialization.toLowerCase().includes("jappa")
          );
        });
        const chosen =
          candidates[Math.floor(Math.random() * candidates.length)] ||
          CAREGIVERS[0];

        const id = `BK-${Date.now().toString(36).toUpperCase()}`;
        const newBooking: Booking = {
          id,
          serviceId: draft.service.id,
          serviceName: draft.service.name,
          category: draft.service.category,
          mode: draft.mode,
          date: draft.date,
          timeSlot: draft.timeSlot,
          address: draft.mode === "physical" ? draft.address! : undefined,
          notes: draft.notes || undefined,
          price:
            draft.mode === "online" && draft.service.onlinePrice
              ? draft.service.onlinePrice
              : draft.mode === "physical" && draft.service.inHomePrice
              ? draft.service.inHomePrice
              : draft.service.price,
          status: "caregiver-assigned",
          caregiverId: chosen.id,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          bookings: [newBooking, ...s.bookings],
          isBookingOpen: false,
          bookingDraft: emptyDraft,
          activeCaregiverId: chosen.id,
        }));

        return id;
      },

      bookings: [],
      cancelBooking: (id) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, status: "cancelled" } : b
          ),
        })),

      activeCaregiverId: null,
      viewCaregiver: (caregiverId) =>
        set({ activeCaregiverId: caregiverId, view: "caregiver-profile" }),

      documents: [],
      addDocument: (doc) =>
        set((s) => ({ documents: [doc, ...s.documents] })),
      deleteDocument: (id) =>
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),

      toast: (msg, type = "default") => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("nurturee-toast", { detail: { msg, type } })
        );
      },
    }),
    {
      name: "nurturee-store",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR-safe noop storage
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),
      // Only persist bookings & documents, not transient UI state
      partialize: (s) => ({
        bookings: s.bookings,
        documents: s.documents,
      }),
    }
  )
);
