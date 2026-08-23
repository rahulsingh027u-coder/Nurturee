"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  MapPin,
  Video,
  Clock,
  Check,
  X,
  Filter,
  Languages,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DOCTORS } from "@/lib/data";
import type { Doctor, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * When a customer clicks "Book Now" on a doctor consultation service, this
 * modal opens FIRST — showing a list of doctors who can provide that service.
 * The customer can filter by area (nearest first) and experience, then pick a
 * specific doctor before proceeding to the calendar/time-slot booking flow.
 *
 * All doctors are equal on the platform — no rank badges, no ratings.
 */
export function DoctorSelectionModal({
  service,
  onClose,
  onSelect,
}: {
  service: Service;
  onClose: () => void;
  onSelect: (doctor: Doctor) => void;
}) {
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [expFilter, setExpFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"area" | "experience" | "fee">("area");

  // Doctors who can provide this specific service
  const eligibleDoctors = useMemo(
    () => DOCTORS.filter((d) => d.serviceIds.includes(service.id)),
    [service.id]
  );

  // Unique areas for the filter dropdown
  const areas = useMemo(
    () => Array.from(new Set(eligibleDoctors.map((d) => d.area))).sort(),
    [eligibleDoctors]
  );

  // Apply filters
  const filtered = useMemo(() => {
    let list = eligibleDoctors;
    if (areaFilter !== "all") {
      list = list.filter((d) => d.area === areaFilter);
    }
    if (expFilter !== "all") {
      const min = parseInt(expFilter, 10);
      list = list.filter((d) => d.experienceYears >= min);
    }
    // Sort
    const sorted = [...list];
    switch (sortBy) {
      case "area":
        sorted.sort((a, b) =>
          a.area.localeCompare(b.area, undefined, { numeric: true })
        );
        break;
      case "experience":
        sorted.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      case "fee":
        sorted.sort((a, b) => a.onlineFee - b.onlineFee);
        break;
    }
    return sorted;
  }, [eligibleDoctors, areaFilter, expFilter, sortBy]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-rose-500 to-pink-600 px-5 py-4 text-white">
          <div className="min-w-0 flex-1">
            <button
              onClick={onClose}
              className="mb-1 inline-flex items-center gap-1 text-xs text-rose-100 hover:text-white"
            >
              <ArrowLeft className="size-3" /> Back to services
            </button>
            <h2 className="text-lg font-bold sm:text-xl">
              Select a {service.name} doctor
            </h2>
            <p className="mt-0.5 text-xs text-rose-50">
              {eligibleDoctors.length} verified doctors available in Gurgaon
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-slate-50 px-5 py-3">
          <Filter className="size-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Filter:</span>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="all">Any experience</option>
            <option value="5">5+ years</option>
            <option value="10">10+ years</option>
            <option value="15">15+ years</option>
            <option value="20">20+ years</option>
          </select>
          <span className="text-xs font-medium text-slate-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "area" | "experience" | "fee")
            }
            className="h-8 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="area">Nearest area first</option>
            <option value="experience">Most experienced</option>
            <option value="fee">Lowest fee</option>
          </select>
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} doctor{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Doctor list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 nice-scroll">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No doctors match your filters
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try changing the area or experience filter.
              </p>
              <button
                onClick={() => {
                  setAreaFilter("all");
                  setExpFilter("all");
                }}
                className="mt-3 inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <DoctorCard
                  key={doc.id}
                  doctor={doc}
                  onSelect={() => onSelect(doc)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="border-t border-border/60 bg-slate-50 px-5 py-3">
          <p className="text-[11px] leading-relaxed text-slate-500">
            💡 Doctors are sorted by nearest area first. All doctors are
            verified, video-interviewed and admin-approved. Online consults
            happen over secure video; in-clinic visits are at the clinic
            address shown.
          </p>
        </div>
      </div>
    </div>
  );
}

function DoctorCard({
  doctor,
  onSelect,
}: {
  doctor: Doctor;
  onSelect: () => void;
}) {
  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm transition-all hover:border-rose-300 hover:shadow-md sm:flex-row sm:items-center">
      {/* Avatar */}
      <div className="flex items-center gap-3 sm:flex-col sm:items-center">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-sm",
            doctor.photoColor
          )}
        >
          {initials}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold sm:text-base">{doctor.name}</h3>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
            <Check className="size-2.5" /> Verified
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-600">{doctor.specialization}</p>
        <p className="text-[11px] text-slate-500">{doctor.qualifications}</p>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 text-rose-500" />
            {doctor.area}
          </span>
          <span className="inline-flex items-center gap-1">
            <Award className="size-3 text-blue-500" />
            {doctor.experienceYears} yrs exp
          </span>
          <span className="inline-flex items-center gap-1">
            <Languages className="size-3 text-indigo-500" />
            {doctor.languages.join(", ")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3 text-emerald-500" />
            {doctor.nextAvailable}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            {doctor.consultations.toLocaleString("en-IN")} consultations
          </span>
        </div>

        {/* Fees */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-rose-700">
            <Video className="size-3" /> ₹{doctor.onlineFee.toLocaleString("en-IN")} online
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
            <MapPin className="size-3" /> ₹{doctor.inHomeFee.toLocaleString("en-IN")} at-clinic
          </span>
        </div>
      </div>

      {/* Select button */}
      <button
        onClick={onSelect}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95 sm:self-center"
      >
        Select &amp; Book
      </button>
    </div>
  );
}
