"use client";

import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  User,
  Video,
  XCircle,
  Eye,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { CAREGIVERS } from "@/lib/data";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  "pending-assignment": {
    label: "Pending assignment",
    cls: "bg-amber-100 text-amber-800",
  },
  "caregiver-assigned": {
    label: "Caregiver assigned",
    cls: "bg-emerald-100 text-emerald-800",
  },
  "in-progress": {
    label: "In progress",
    cls: "bg-blue-100 text-blue-800",
  },
  completed: { label: "Completed", cls: "bg-slate-200 text-slate-800" },
  cancelled: { label: "Cancelled", cls: "bg-rose-100 text-rose-800" },
};

export function MyBookingsView() {
  const bookings = useAppStore((s) => s.bookings);
  const setView = useAppStore((s) => s.setView);
  const viewCaregiver = useAppStore((s) => s.viewCaregiver);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const toast = useAppStore((s) => s.toast);

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => setView("home")}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-blue-700"
        >
          <ArrowLeft className="size-4" /> Back to Home
        </button>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          My Bookings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your service requests, view assigned caregivers and cancel if
          plans change.
        </p>

        {bookings.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <CalendarDays className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-3 text-base font-semibold">No bookings yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a service to make your first booking.
            </p>
            <button
              onClick={() => setView("home")}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {bookings.map((b) => {
              const caregiver = CAREGIVERS.find((c) => c.id === b.caregiverId);
              const status = STATUS_LABEL[b.status];
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold sm:text-base">
                          {b.serviceName}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {b.id}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-blue-700">
                      ₹{b.price.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-700 sm:grid-cols-2 sm:text-sm">
                    <p className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-blue-600" />
                      {format(new Date(b.date), "EEE, dd MMM yyyy")}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5 text-blue-600" />
                      {b.timeSlot}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      {b.mode === "online" ? (
                        <>
                          <Video className="size-3.5 text-rose-600" /> Online
                          consultation
                        </>
                      ) : (
                        <>
                          <MapPin className="size-3.5 text-indigo-600" />
                          In-home visit
                        </>
                      )}
                    </p>
                    {b.address && (
                      <p className="inline-flex items-start gap-1.5 sm:col-span-2">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-indigo-600" />
                        <span className="text-xs">
                          {b.address.fullName} • {b.address.phone} •{" "}
                          {b.address.line1}
                          {b.address.line2 ? `, ${b.address.line2}` : ""},{" "}
                          {b.address.city} {b.address.pincode}
                          {b.address.landmark
                            ? ` — ${b.address.landmark}`
                            : ""}
                        </span>
                      </p>
                    )}
                  </div>

                  {b.notes && (
                    <p className="mt-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                      <strong>Note:</strong> {b.notes}
                    </p>
                  )}

                  {/* Assigned caregiver mini-card */}
                  {caregiver && b.status === "caregiver-assigned" && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${caregiver.photoColor} text-xs font-bold text-white`}
                      >
                        {caregiver.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-emerald-900">
                          Assigned caregiver
                        </p>
                        <p className="text-sm font-semibold text-emerald-900">
                          {caregiver.name} • {caregiver.specialization}
                        </p>
                      </div>
                      <button
                        onClick={() => viewCaregiver(caregiver.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-medium text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 active:scale-95"
                      >
                        <Eye className="size-3.5" /> View
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {b.status === "caregiver-assigned" && (
                    <div className="mt-3 flex gap-2">
                      {caregiver && (
                        <button
                          onClick={() => viewCaregiver(caregiver.id)}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <User className="size-3.5" /> View Caregiver
                        </button>
                      )}
                      <button
                        onClick={() => {
                          cancelBooking(b.id);
                          toast("Booking cancelled.", "default");
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        <XCircle className="size-3.5" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
