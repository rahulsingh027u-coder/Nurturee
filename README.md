# Nurturee — Trusted Care for Your Loved Ones

A customer-facing care services web app for booking verified child care, elder care, doctor consultation, and caregiver verification services in Gurgaon. Built PWA-ready for Android & iOS conversion. Includes a built-in **WebRTC video calling** feature that connects the customer app with a doctor portal.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![PWA](https://img.shields.io/badge/PWA-Ready-purple)

---

## Features

### Customer App
- **20 services** across 4 categories with Gurgaon-calibrated pricing
- **Child Care (8):** Pregnancy Planning, Prenatal, Postnatal, Child Health, Women Health + Day Nanny, 24-hr Live-in Nanny, Jappa Nanny
- **Elder Care (5):** Companionship, Medical Attendant, Full-Time 24-hr, Dementia/Alzheimer's, Post-Hospitalisation
- **Doctor Consultation (4):** Pediatrician, Gynaecologist, Geriatric Specialist, GP — online + in-home
- **Caregiver Verification (3):** Basic Background Check, Comprehensive Verification, Video Verification Add-on
- **Booking flow:** Mode selection → Calendar → Time slot → Address (physical only) → Review → Confirm
- **Post-booking:** View assigned caregiver's full verified profile (Name, DOB, Marital Status, Address, Emergency Contact, masked Aadhaar, Police ref, Video verification, Medical fitness, Certifications)
- **Document Vault:** Upload prescriptions, lab reports, IDs — stored locally per device
- **My Bookings:** Track all bookings, cancel, view caregiver

### Video Calling (WebRTC)
- Real peer-to-peer video + audio between doctor and customer
- **Doctor locks the customer's time slot** → customer gets instant notification + "Join Video Call" button
- **Doctor starts the call** → customer's screen rings with Accept/Decline
- Full video call UI: remote video full-screen, local video picture-in-picture, mute, camera toggle, end call, live timer
- Uses `BroadcastChannel` for signaling (same-origin tabs) — no server needed for demo
- For production: replace with WebSocket signaling server for cross-device calls

### Doctor Portal (Demo)
- Hidden view accessible via `#doctor` hash or footer link
- Shows all patient bookings
- Lock/unlock time slots (notifies customer instantly)
- Start video call by entering customer's Peer ID
- Would be a separate authenticated app in production

### Trust & Safety (replaces fake testimonials)
- No fake "5000+ families" stats or testimonials
- Instead: 6 concrete verification pillars (Background-Verified, Video Interview, Documents You Can See, Real Human Support, Data Privacy, Medically Trained)
- Honest "we are new" disclosure

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| State | Zustand (with localStorage persistence) |
| Real-time | WebRTC + BroadcastChannel |
| Calendar | react-day-picker + date-fns |
| Database | Prisma ORM (SQLite, ready for use) |
| PWA | manifest.webmanifest + Apple meta tags + safe-area insets |

---

## Quick Start

```bash
# Install dependencies
bun install

# Run dev server
bun run dev    # → http://localhost:3000

# Lint
bun run lint
```

---

## Testing the Video Call

The video call works between two browser tabs on the same origin:

1. **Tab 1 (Customer):** Book a service → go to **My Bookings** → note your **Peer ID**
2. **Tab 2 (Doctor):** Open `http://localhost:3000/#doctor` (or footer → "Doctor Portal (demo)")
3. **Doctor tab:** Click **Lock Slot** → customer tab gets a notification
4. **Doctor tab:** Paste customer's Peer ID → click **Start Call**
5. **Customer tab:** Click **Accept** → video call connects (allow camera/mic permission)
6. Test mute, camera off, end call

On a real device (phone/laptop), the camera and microphone work natively.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # PWA metadata, theme color
│   ├── page.tsx            # View router (8 views + video overlay)
│   └── globals.css         # Brand styles, animations, safe-area
├── lib/
│   ├── types.ts            # Service, Caregiver, Booking, VideoCall types
│   ├── data.ts             # 20 services + 6 caregivers (Gurgaon pricing)
│   ├── store.ts            # Zustand store (bookings, documents, video call)
│   └── videoCall.ts        # WebRTC manager + BroadcastChannel signaling
└── components/
    ├── site/
    │   ├── Header.tsx              # Sticky nav + mobile menu
    │   ├── Footer.tsx             # 4-column footer + doctor portal link
    │   ├── BottomNav.tsx          # Mobile bottom tab bar
    │   ├── HeroSection.tsx        # Blue/indigo gradient hero
    │   ├── ServicesSection.tsx    # 4-category service grid
    │   ├── HowItWorks.tsx         # 3-step process
    │   ├── TrustSection.tsx       # 6 verification pillars (no fake stats)
    │   ├── CTASection.tsx         # Bottom call-to-action
    │   ├── ServiceDetailView.tsx  # Reusable service listing page
    │   ├── BookingModal.tsx       # Multi-step booking flow
    │   ├── CaregiverProfileView.tsx # Post-booking caregiver profile
    │   ├── MyBookingsView.tsx     # Booking history + join call button
    │   ├── MyDocumentsView.tsx    # Prescription/report upload
    │   ├── DoctorConsoleView.tsx  # Doctor portal (lock + start call)
    │   ├── VideoCallView.tsx      # Full-screen video call UI
    │   └── ToastHost.tsx          # Global notifications
    └── ui/                  # 48 shadcn/ui components
public/
    └── manifest.webmanifest  # PWA manifest
```

---

## Roadmap

This is **site 1 of 3** planned:

1. ✅ **Customer App** (this repo)
2. ⏳ **Admin Portal** — manage caregivers, approve bookings, assign caregivers
3. ⏳ **Caregiver/Doctor App** — receive assignments, accept/decline, start calls

All three will share the same Prisma schema and API routes.

---

## Converting to Android / iOS

This app is PWA-ready. Two paths:

**Option A: PWA install** — Deploy to HTTPS, then "Add to Home Screen" from browser.

**Option B: Capacitor wrapper** (recommended for app store distribution):
```bash
npm install @capacitor/core @capacitor/cli
npx cap init Nurturee com.nurturee.app --web-dir=out
npx cap add android && npx cap add ios
npx cap copy && npx cap open android
```

The codebase already includes safe-area insets, touch-friendly targets, bottom navigation, portrait lock, and `user-scalable=no` viewport.

---

## License

Proprietary — © Nurturee. All rights reserved.
