"use client";

import { useAppStore } from "@/lib/store";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BottomNav } from "@/components/site/BottomNav";
import { ToastHost } from "@/components/site/ToastHost";
import { BookingModal } from "@/components/site/BookingModal";
import { HomeView } from "@/components/site/HomeView";
import { ServiceDetailView } from "@/components/site/ServiceDetailView";
import { CaregiverProfileView } from "@/components/site/CaregiverProfileView";
import { MyBookingsView } from "@/components/site/MyBookingsView";
import { MyDocumentsView } from "@/components/site/MyDocumentsView";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const bookingSessionId = useAppStore((s) => s.bookingSessionId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <ToastHost />

      <main className="flex-1 pb-16 md:pb-0">
        {view === "home" && <HomeView />}
        {view === "childcare" && <ServiceDetailView category="childcare" />}
        {view === "eldercare" && <ServiceDetailView category="eldercare" />}
        {view === "doctor" && <ServiceDetailView category="doctor" />}
        {view === "verification" && (
          <ServiceDetailView category="verification" />
        )}
        {view === "bookings" && <MyBookingsView />}
        {view === "documents" && <MyDocumentsView />}
        {view === "caregiver-profile" && <CaregiverProfileView />}
      </main>

      <Footer />
      <BottomNav />
      <BookingModal key={bookingSessionId} />
    </div>
  );
}
