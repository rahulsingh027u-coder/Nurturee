# Nurturee — Customer Care Services App

A customer-facing web app for booking verified child care, elder care, doctor
consultation and caregiver verification services in Gurgaon. Built PWA-ready
for Android & iOS conversion.

This is **site 1 of 3** planned by the founder:
1. ✅ **Customer app** (this repo)
2. ⏳ Admin portal — coming soon
3. ⏳ Caregiver / Doctor app — coming soon

---

## Quick Start

```bash
# Install dependencies
bun install

# Run dev server
bun run dev    # http://localhost:3000

# Lint
bun run lint

# Push Prisma schema (if you add DB models)
bun run db:push
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **State**: Zustand (with localStorage persistence for bookings & documents)
- **Calendar**: react-day-picker + date-fns
- **Database**: Prisma ORM (SQLite client) — ready for use, schema in `prisma/`
- **PWA**: manifest at `public/manifest.webmanifest`, Apple web app meta tags,
  safe-area insets for iOS notch

---

## File Manifest

### App shell
| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout, PWA metadata, theme color, viewport |
| `src/app/page.tsx` | Main page — view router switches between 8 views |
| `src/app/globals.css` | Brand styles, animations, safe-area, custom scrollbars |
| `src/app/api/route.ts` | Health check endpoint |
| `public/manifest.webmanifest` | PWA manifest for app conversion |
| `next.config.ts` | Allowed dev origins for preview URLs |

### Domain logic (`src/lib/`)
| File | Purpose |
|------|---------|
| `types.ts` | Service, Caregiver, Booking, CustomerDocument, AppView types |
| `data.ts` | 20 services with Gurgaon pricing + 6 mock caregivers + 6 trust pillars |
| `store.ts` | Zustand store: views, booking draft, bookings, documents, toast |
| `db.ts` | Prisma client (ready for use) |
| `utils.ts` | `cn()` class merge helper |

### Site components (`src/components/site/`)
| File | Purpose |
|------|---------|
| `Header.tsx` | Sticky top nav with desktop + mobile menu, bookings badge |
| `Footer.tsx` | 4-column footer with services, contact, account, legal links |
| `BottomNav.tsx` | Mobile-only bottom tab bar (Home, Child, Elder, Bookings, Docs) |
| `ToastHost.tsx` | Global toast notifications |
| `HeroSection.tsx` | Blue/indigo gradient hero with decorative icon grid |
| `ServicesSection.tsx` | 4-category service grid on home |
| `HowItWorks.tsx` | 3-step process (Choose → Book → Caregiver Assigned) |
| `TrustSection.tsx` | Replaces fake "Why Trust Us" stats — 6 verification pillars + honest note |
| `CTASection.tsx` | Bottom call-to-action card |
| `HomeView.tsx` | Composes the 5 home sections |
| `ServiceDetailView.tsx` | Reusable detail view for childcare / eldercare / doctor / verification |
| `BookingModal.tsx` | Multi-step booking: mode → calendar → time → address → review → confirm |
| `CaregiverProfileView.tsx` | Post-booking caregiver profile with all verification details |
| `MyBookingsView.tsx` | Customer booking history with cancel + view caregiver |
| `MyDocumentsView.tsx` | Prescription/report/ID upload + filter + download/delete |
| `Icons.tsx` | Lucide icon registry + accent color classes |

### shadcn/ui components (`src/components/ui/`)
48 pre-installed components — accordion, alert, avatar, badge, button,
calendar, card, carousel, chart, checkbox, collapsible, command, context-menu,
dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label,
menubar, navigation-menu, pagination, popover, progress, radio-group,
resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider,
sonner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle,
tooltip.

---

## Services Catalog (Gurgaon pricing)

### Child Care (8 services)
- **Pregnancy Planning** — ₹1,500 online / ₹2,500 at-home — 45 min
- **Prenatal Care** — ₹2,000 / ₹3,500 — 60 min
- **Postnatal Care** — ₹2,000 / ₹3,500 — 60 min
- **Child Health Care** — ₹1,000 / ₹2,000 — 30 min
- **Women Health** — ₹1,500 / ₹2,500 — 45 min
- **Day Nanny** — ₹18,000/mo — 8–10 hrs/day, 6 days/week
- **24-Hour Live-in Nanny** — ₹30,000/mo — 24 hrs
- **Jappa Nanny** — ₹35,000/mo — 40-day cycle

### Elder Care (5 services)
- **Elderly Companionship** — ₹15,000/mo — 4 hrs/day
- **Elderly Medical Attendant** — ₹25,000/mo — 12 hrs/day
- **Full-Time Elder Caregiver (24 hr)** — ₹35,000/mo
- **Dementia / Alzheimer's Care** — ₹28,000/mo — 12 hrs/day
- **Post-Hospitalisation Care** — ₹2,500/visit — 45–60 min

### Doctor Consultation (4 services)
- **Pediatrician** — ₹800 online / ₹2,000 at-home
- **Gynaecologist** — ₹1,000 / ₹2,500
- **Geriatric Specialist** — ₹1,200 / ₹3,000
- **General Physician** — ₹500 / ₹1,500

### Caregiver Verification (3 services)
- **Basic Background Check** — ₹499 — 5 working days
- **Comprehensive Verification** — ₹1,499 — 7–10 working days
- **Video Verification Add-on** — ₹499 — 20 min interview

Pricing benchmarked against Portea, Care24, Momkidcare, Urban Company,
Healers at Home and Justdial listings for Gurgaon (2025-26).

---

## Booking Flow

1. **Mode** — Online vs In-Home (only for `both` services)
2. **Schedule** — Calendar (60-day window) + time slot grid (10 slots)
3. **Address** — Required for physical only (name, phone, address, pincode)
4. **Review** — All details + price + optional notes
5. **Confirm** — Simulates admin assigning a verified caregiver (1.2s)
6. **Success** — Booking ID + links to caregiver profile & My Bookings

After confirmation, the customer sees the assigned caregiver's full verified
profile: Name, DOB, Gender, Marital Status, Address, Specialization,
Experience, Languages, Emergency Contact (mother/father/guardian/spouse),
masked Aadhaar + verification, Police ref no + date, Video verification,
Medical fitness, References checked, Certifications, Document Vault link.

---

## Building Sites 2 & 3 (Admin + Caregiver App)

When ready, create two more Next.js projects that share the same Prisma
schema. The customer app already persists bookings & documents to
localStorage; for production, replace the Zustand store's mock
`confirmBooking` with real API calls that:

1. POST `/api/bookings` — creates booking with status `pending-assignment`
2. Admin portal picks up the booking, assigns a caregiver → status
   `caregiver-assigned`
3. Caregiver app receives the assignment, accepts/declines
4. Customer app polls or subscribes (WebSocket) for status updates

Suggested shared Prisma models: `User`, `Caregiver`, `Service`, `Booking`,
`CustomerDocument`, `Verification`, `AuditLog`.

---

## Converting to Android / iOS

This app is PWA-ready. Two paths:

### Option A: PWA install (fastest)
- Deploy to HTTPS
- Android Chrome → "Add to Home Screen"
- iOS Safari → "Add to Home Screen"
- manifest.webmanifest + theme color already configured

### Option B: Native wrapper (Capacitor recommended)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init Nurturee com.nurturee.app --web-dir=out
# Add platforms
npx cap add android
npx cap add ios
# Build web (after `next build` with `output: 'export'`)
npx cap copy
npx cap open android   # or ios
```

The codebase already uses:
- ✅ Safe-area insets (`.pb-safe`, `.pt-safe`)
- ✅ Touch-friendly 44px+ tap targets
- ✅ Bottom navigation (mobile only)
- ✅ Portrait orientation lock in manifest
- ✅ No hover-dependent interactions
- ✅ `user-scalable=no` viewport
- ✅ `-webkit-tap-highlight-color: transparent`

---

## Verification Done

- ✅ ESLint: 0 errors, 0 warnings
- ✅ Browser console: no app errors
- ✅ Dev log: 200 OK responses, no runtime errors
- ✅ End-to-end booking flow tested (online + physical)
- ✅ Caregiver profile verified with all required fields
- ✅ Document upload verified (auto-classification works)
- ✅ Mobile (390x844) + Desktop (1280x800) layouts verified
- ✅ All 4 service category pages render correctly

---

© Nurturee. All rights reserved.
