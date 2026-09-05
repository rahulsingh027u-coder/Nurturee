"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  MapPin,
  Video,
  Clock,
  Check,
  Search,
  Filter,
  Languages,
  X,
  Stethoscope,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DOCTORS, SERVICES } from "@/lib/data";
import type { Doctor, Service } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Approximate coordinates (lat, lng) for Gurgaon sectors that appear in the
 * doctor network. Used by the "Use My Location" feature to find the nearest
 * sector to the user's GPS position.
 */
/**
 * Precise coordinates (lat, lng) for Gurgaon sectors — the centroid of each
 * sector based on Google Maps. Used to find the nearest sector to the user's
 * GPS position when reverse geocoding fails.
 */
const SECTOR_COORDS: Record<string, { lat: number; lng: number }> = {
  "Sector 14": { lat: 28.4728, lng: 77.0692 },
  "Sector 15": { lat: 28.4792, lng: 77.0775 },
  "Sector 18": { lat: 28.4649, lng: 77.0583 },
  "Sector 29": { lat: 28.4679, lng: 77.0501 },
  "Sector 31": { lat: 28.4572, lng: 77.0602 },
  "Sector 40": { lat: 28.4484, lng: 77.0823 },
  "Sector 43": { lat: 28.4523, lng: 77.0862 },
  "Sector 44": { lat: 28.4442, lng: 77.0845 },
  "Sector 49": { lat: 28.4385, lng: 77.0921 },
  "Sector 50": { lat: 28.4343, lng: 77.0953 },
  "Sector 56": { lat: 28.4243, lng: 77.0785 },
  "Sector 61": { lat: 28.4153, lng: 77.0623 },
  "Sector 82": { lat: 28.4043, lng: 77.0503 },
};

/** Haversine formula — distance in km between two lat/lng points. */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Find the nearest sector name from a given lat/lng. */
function findNearestSector(lat: number, lng: number): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const [sector, coords] of Object.entries(SECTOR_COORDS)) {
    const d = distanceKm(lat, lng, coords.lat, coords.lng);
    if (d < minDist) {
      minDist = d;
      nearest = sector;
    }
  }
  return nearest;
}

/**
 * Doctor Search View — replaces the service-card grid on the Doctor page.
 *
 * Patients can:
 *   1. Type in the search bar to find doctors by name, specialization, area,
 *      or qualifications (e.g. "pediatric", "Sector 14", "gynaecologist").
 *   2. Filter by specialization, area, experience.
 *   3. Sort by nearest area, experience, or fee.
 *   4. Click "Book Now" on a doctor → if the doctor provides only one service,
 *      the booking modal opens directly; if multiple, a service picker pops up.
 */
export function DoctorSearchView() {
  const setView = useAppStore((s) => s.setView);
  const openBooking = useAppStore((s) => s.openBooking);
  const setDraftDoctor = useAppStore((s) => s.setDraftDoctor);
  const toast = useAppStore((s) => s.toast);

  const [query, setQuery] = useState("");
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [expFilter, setExpFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"area" | "experience" | "fee">(
    "area"
  );
  const [servicePickerDoctor, setServicePickerDoctor] = useState<Doctor | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [detectedArea, setDetectedArea] = useState<string | null>(null);
  const [apiDoctors, setApiDoctors] = useState<Doctor[]>([]);

  /** Reverse-geocode the user's GPS coordinates using the free OpenStreetMap
   *  Nominatim API. Returns the matched Gurgaon sector if found, else null. */
  async function reverseGeocode(
    lat: number,
    lng: number
  ): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en" },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const addr = data?.address;
      if (!addr) return null;
      // Collect all text fields that might contain a sector name
      const fields = [
        addr.suburb,
        addr.neighbourhood,
        addr.quarter,
        addr.city_district,
        addr.residential,
        addr.hamlet,
        addr.subdistrict,
        addr.county,
      ].filter(Boolean) as string[];
      const allText = fields.join(" ");
      // Match "Sector NN" anywhere in the address
      const match = allText.match(/Sector\s*(\d+)/i);
      if (match) {
        return `Sector ${match[1]}`;
      }
    } catch {
      // Network error — fall back to Haversine
    }
    return null;
  }

  /** Use the browser's Geolocation API to fetch the user's precise location,
   *  reverse-geocode it to get the actual sector name, and apply it as the
   *  area filter. Falls back to Haversine nearest-sector if geocoding fails. */
  // Fetch doctors from API
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        const mapped = (data.doctors || []).map((d: any) => ({
          ...d,
          qualifications: d.degree || d.qualifications || "",
          onlineFee: d.feeOnline ?? d.onlineFee ?? 0,
          offlineFee: d.feeOffline ?? d.offlineFee ?? 0,
          languages: typeof d.languages === "string" ? JSON.parse(d.languages || "[]") : (d.languages || []),
          serviceIds: [],
        }));
        setApiDoctors(mapped);
      })
      .catch(() => {});
  }, []);

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast("Geolocation is not supported by your browser.", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        // Step 1: Try reverse geocoding to get the actual sector name
        const geocodedSector = await reverseGeocode(latitude, longitude);
        // Step 2: Check if the geocoded sector exists in our doctor network
        const doctorAreas = Array.from(new Set(apiDoctors.map((d) => d.area)));
        let nearest: string | null = null;
        let method = "GPS nearest";
        if (geocodedSector && doctorAreas.includes(geocodedSector)) {
          nearest = geocodedSector;
          method = "address match";
        }
        // Step 3: Fallback to Haversine if geocoding didn't match
        if (!nearest) {
          nearest = findNearestSector(latitude, longitude);
          method = "GPS nearest";
        }
        setLocating(false);
        if (nearest) {
          setAreaFilter(nearest);
          setDetectedArea(nearest);
          const accText = accuracy ? ` ±${Math.round(accuracy)}m` : "";
          toast(
            `📍 ${nearest} (${method}${accText})`,
            "success"
          );
        } else {
          toast("Could not determine your nearby sector.", "error");
        }
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Please allow location access in your browser settings."
            : err.code === err.POSITION_UNAVAILABLE
            ? "Location information is unavailable. Try again outdoors or near a window."
            : err.code === err.TIMEOUT
            ? "Location request timed out. Make sure GPS is enabled on your device."
            : "Could not fetch your location.";
        toast(msg, "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Unique specializations for the filter dropdown
  const specializations = useMemo(
    () => Array.from(new Set(apiDoctors.map((d) => d.specialization))).sort(),
    [apiDoctors]
  );

  // Unique areas for the filter dropdown
  const areas = useMemo(
    () => Array.from(new Set(apiDoctors.map((d) => d.area))).sort(),
    [apiDoctors]
  );

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = apiDoctors;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.area.toLowerCase().includes(q) ||
          d.qualifications.toLowerCase().includes(q) ||
          d.languages.some((l) => l.toLowerCase().includes(q))
      );
    }
    if (specFilter !== "all") {
      list = list.filter((d) => d.specialization === specFilter);
    }
    if (areaFilter !== "all") {
      list = list.filter((d) => d.area === areaFilter);
    }
    if (expFilter !== "all") {
      const min = parseInt(expFilter, 10);
      list = list.filter((d) => d.experienceYears >= min);
    }
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
  }, [query, specFilter, areaFilter, expFilter, sortBy, apiDoctors]);

  // When "Book Now" is clicked on a doctor:
  //  - If the doctor provides only 1 service → open booking modal directly
  //  - If multiple services → show the service picker
  const handleBookDoctor = (doctor: Doctor) => {
    const docServices = SERVICES.filter((s) => doctor.serviceIds.includes(s.id));
    if (docServices.length === 1) {
      openBooking(docServices[0]);
      setDraftDoctor(doctor);
    } else {
      setServicePickerDoctor(doctor);
    }
  };

  // When a service is picked from the picker → open booking modal
  const handlePickService = (service: Service) => {
    if (!servicePickerDoctor) return;
    openBooking(service);
    setDraftDoctor(servicePickerDoctor);
    setServicePickerDoctor(null);
  };

  const clearFilters = () => {
    setQuery("");
    setSpecFilter("all");
    setAreaFilter("all");
    setExpFilter("all");
  };

  const hasActiveFilters =
    query !== "" ||
    specFilter !== "all" ||
    areaFilter !== "all" ||
    expFilter !== "all";

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => setView("home")}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-blue-700"
        >
          <ArrowLeft className="size-4" /> Back to Home
        </button>

        {/* Header — centered */}
        <div className="mb-6 text-center">
          <span className="mb-3 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
            <Stethoscope className="size-3" /> Doctor Consultation
          </span>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Find a Doctor
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Search our network of verified doctors across Gurgaon. Filter by
            specialization, area, or experience — then book an online video
            consult or an in-clinic visit.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by doctor name, specialization, area, or language…"
            className="h-12 w-full rounded-xl border border-border bg-white pl-12 pr-10 text-sm shadow-sm transition-all focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filters row */}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-slate-500" />
          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="all">All specializations</option>
            {specializations.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Area filter — single dropdown with "Nearby" as first option */}
          <select
            value={locating ? "detect" : areaFilter}
            onChange={(e) => {
              if (e.target.value === "detect") {
                handleUseMyLocation();
              } else {
                setAreaFilter(e.target.value);
                setDetectedArea(null);
              }
            }}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="detect">
              {locating ? "Finding nearby…" : "📍 Nearby"}
            </option>
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
                {a === detectedArea ? " (nearby)" : ""}
              </option>
            ))}
          </select>
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="all">Any experience</option>
            <option value="5">5+ years</option>
            <option value="10">10+ years</option>
            <option value="15">15+ years</option>
            <option value="20">20+ years</option>
          </select>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-medium text-slate-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "area" | "experience" | "fee")
            }
            className="h-9 rounded-lg border border-border bg-white px-2 text-xs font-medium"
          >
            <option value="area">Nearest area</option>
            <option value="experience">Most experienced</option>
            <option value="fee">Lowest fee</option>
          </select>
          {hasActiveFilters && (
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                <X className="size-3" /> Clear all
              </button>
              <span className="text-xs text-slate-500">
                {filtered.length} doctor{filtered.length !== 1 ? "s" : ""} found
              </span>
            </div>
          )}
        </div>

        {/* Results */}
        {!hasActiveFilters ? (
          // No search or filter active — show a prompt to start searching
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-14">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-rose-50">
              <Search className="size-8 text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Search for a doctor
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Type a doctor&apos;s name, specialization (e.g.{" "}
              <strong>cardiologist</strong>, <strong>pediatrician</strong>),
              area (e.g. <strong>Sector 14</strong>), or symptom in the search
              bar above — or pick a filter to see matching doctors.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                "Pediatrician",
                "Gynaecologist",
                "Cardiologist",
                "Dermatologist",
                "General Physician",
                "Dentist",
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="rounded-full border border-rose-200 bg-rose-50/50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-all hover:bg-rose-100"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          // Search/filter active but no results
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Search className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-3 text-base font-semibold">No doctors found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or clear the filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-rose-500 px-5 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          // Results found
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((doc) => (
              <DoctorSearchCard
                key={doc.id}
                doctor={doc}
                onBook={() => handleBookDoctor(doc)}
              />
            ))}
          </div>
        )}

        {/* Service picker modal — when a doctor provides multiple services */}
        {servicePickerDoctor && (
          <ServicePickerModal
            doctor={servicePickerDoctor}
            onClose={() => setServicePickerDoctor(null)}
            onPick={handlePickService}
          />
        )}
      </div>
    </div>
  );
}

// ===== Doctor Card =====
function DoctorSearchCard({
  doctor,
  onBook,
}: {
  doctor: Doctor;
  onBook: () => void;
}) {
  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  // Services this doctor provides
  const docServices = SERVICES.filter((s) => doctor.serviceIds.includes(s.id));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:border-rose-300 hover:shadow-md sm:p-5">
      {/* Top row: avatar + name */}
      <div className="flex items-start gap-3">
        <div className="shrink-0">
         {(doctor as any).avatar ? (
            <img
              src={(doctor as any).avatar}
              alt={doctor.name}
              className="size-14 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-sm",
                doctor.photoColor
              )}
            >
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold sm:text-base">{doctor.name}</h3>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
              <Check className="size-2.5" /> Verified
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-rose-600">
            {doctor.specialization}
          </p>
          <p className="text-[11px] text-slate-500">{doctor.qualifications}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
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
      </div>

      {/* Services tags */}
      {docServices.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {docServices.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Fees + book button */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
            <Video className="size-3" /> ₹{doctor.onlineFee.toLocaleString("en-IN")}
            <span className="font-normal text-slate-500">online</span>
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-indigo-700">
            <MapPin className="size-3" /> ₹{doctor.inHomeFee.toLocaleString("en-IN")}
            <span className="font-normal text-slate-500">at-clinic</span>
          </span>
        </div>
        <button
          onClick={onBook}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}

// ===== Service Picker Modal =====
function ServicePickerModal({
  doctor,
  onClose,
  onPick,
}: {
  doctor: Doctor;
  onClose: () => void;
  onPick: (service: Service) => void;
}) {
  const docServices = SERVICES.filter((s) => doctor.serviceIds.includes(s.id));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-rose-500 to-pink-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs text-rose-100">Book an appointment with</p>
            <h2 className="text-lg font-bold">{doctor.name}</h2>
            <p className="text-xs text-rose-50">{doctor.specialization}</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            What do you need help with?
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Dr. {doctor.name.replace("Dr. ", "")} provides the following
            consultation types. Select one to continue booking.
          </p>
          <div className="space-y-2">
            {docServices.map((s) => (
              <button
                key={s.id}
                onClick={() => onPick(s)}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-rose-300 hover:bg-rose-50/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Stethoscope className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {s.duration} •{" "}
                    <span className="font-medium text-rose-700">
                      ₹{doctor.onlineFee.toLocaleString("en-IN")} online
                    </span>{" "}
                    /{" "}
                    <span className="font-medium text-indigo-700">
                      ₹{doctor.inHomeFee.toLocaleString("en-IN")} at-clinic
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
