// Core domain types for the Nurturee customer app

export type ServiceCategory =
  | "childcare"
  | "eldercare"
  | "doctor"
  | "verification";

export type ServiceMode = "physical" | "online" | "both";

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Short description used on cards */
  shortDescription: string;
  /** Long description shown on the service detail page */
  longDescription: string;
  mode: ServiceMode;
  /** Price in INR for a single session / visit / month (see priceUnit) */
  price: number;
  priceUnit: string; // e.g. "per session", "per month", "per visit"
  /** Optional "starting from" pricing for online variant */
  onlinePrice?: number;
  inHomePrice?: number;
  duration: string; // e.g. "45 min", "8 hours", "Full day"
  icon: string; // lucide icon name
  /** Sub-services / inclusion bullet points */
  features: string[];
  /** Optional gradient classes for the icon badge */
  accent: "blue" | "indigo" | "rose" | "amber" | "emerald" | "violet";
}

export interface Caregiver {
  id: string;
  name: string;
  /** ISO date string */
  dob: string;
  age: number;
  gender: "Male" | "Female";
  maritalStatus: "Single" | "Married" | "Widowed" | "Divorced";
  /** Full residential address shown to customer */
  address: string;
  /** City / area locator */
  area: string;
  /** Specialisation — e.g. "Newborn Care", "Elder Nursing Attendant" */
  specialization: string;
  /** Years of experience */
  experienceYears: number;
  /** Languages spoken */
  languages: string[];
  /** Skills / certifications */
  certifications: string[];
  /** Emergency contact — mother / father / guardian */
  emergency: {
    name: string;
    relation: string;
    phone: string;
  };
  /** Aadhaar — last 4 visible, rest masked */
  aadhaarMasked: string;
  aadhaarVerified: boolean;
  policeVerification: {
    done: boolean;
    verifiedOn: string; // ISO date
    referenceNo: string;
  };
  /** Video verification status */
  videoVerification: {
    done: boolean;
    verifiedOn: string;
  };
  /** Medical fitness check */
  medicalFitness: boolean;
  /** References checked */
  referencesChecked: number;
  /** Mock profile photo URL — using initials avatar in UI */
  photoColor: string; // gradient classes
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  mode: "physical" | "online";
  date: string; // ISO date (yyyy-mm-dd)
  timeSlot: string;
  address?: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    pincode: string;
    landmark?: string;
  };
  notes?: string;
  price: number;
  status:
    | "pending-assignment"
    | "caregiver-assigned"
    | "in-progress"
    | "completed"
    | "cancelled";
  caregiverId?: string;
  /** For doctor bookings — the selected doctor's id */
  doctorId?: string;
  createdAt: string;
}

/**
 * A doctor in the Nurturee network. Each doctor belongs to one or more
 * service categories (matched via `serviceIds`) so the customer can pick
 * a specific doctor when booking a consultation.
 */
export interface Doctor {
  id: string;
  name: string;
  /** Medical qualifications, e.g. "MBBS, MS (OBG)" */
  qualifications: string;
  /** Specialization label shown on the card */
  specialization: string;
  /** Service IDs this doctor can be booked for (links to Service.id) */
  serviceIds: string[];
  /** Years of clinical experience */
  experienceYears: number;
  /** Gurgaon sector / area where the doctor's clinic is */
  area: string;
  /** Full clinic address */
  clinicAddress: string;
  /** Languages spoken */
  languages: string[];
  /** Online consult fee in INR */
  onlineFee: number;
  /** In-home visit fee in INR */
  inHomeFee: number;
  /** Next available slot label, e.g. "Today, 4:00 PM" */
  nextAvailable: string;
  /** Gradient classes for the avatar */
  photoColor: string;
  /** Rating out of 5 (mock for demo) */
  rating: number;
  /** Number of consultations done (mock for demo) */
  consultations: number;
}

export interface CustomerDocument {
  id: string;
  name: string;
  type: "prescription" | "report" | "id" | "other";
  mimeType: string;
  sizeBytes: number;
  /** Data URL — stored locally only in this demo (no server upload) */
  dataUrl: string;
  uploadedAt: string;
  /** Optional linked booking */
  bookingId?: string;
}

export type AppView =
  | "home"
  | "childcare"
  | "eldercare"
  | "doctor"
  | "verification"
  | "bookings"
  | "documents"
  | "caregiver-profile"
  | "doctor-console";

export type VideoCallStatus =
  | "idle" // no active call
  | "ringing" // doctor started call, customer being notified
  | "connecting" // offer/answer exchange in progress
  | "connected" // peer connection established, video flowing
  | "ended"
  | "failed";
