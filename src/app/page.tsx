"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BottomNav } from "@/components/site/BottomNav";
import { ToastHost } from "@/components/site/ToastHost";
import { BookingModal } from "@/components/site/BookingModal";
import { HomeView } from "@/components/site/HomeView";
import { ServiceDetailView } from "@/components/site/ServiceDetailView";
import { DoctorSearchView } from "@/components/site/DoctorSearchView";
import { CaregiverProfileView } from "@/components/site/CaregiverProfileView";
import { MyBookingsView } from "@/components/site/MyBookingsView";
import { MyDocumentsView } from "@/components/site/MyDocumentsView";
import { DoctorConsoleView } from "@/components/site/DoctorConsoleView";
import { VideoCallView } from "@/components/site/VideoCallView";

export default function Home() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const bookingSessionId = useAppStore((s) => s.bookingSessionId);
  const initVideoCall = useAppStore((s) => s.initVideoCall);

  useEffect(() => {
    initVideoCall();
  }, [initVideoCall]);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#doctor" || hash === "#doctor-portal") {
        setView("doctor-console");
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [setView]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <ToastHost />
      <main className="flex-1 pb-16 md:pb-0">
        {view === "home" && <HomeView />}
        {view === "childcare" && <ServiceDetailView category="childcare" />}
        {view === "eldercare" && <ServiceDetailView category="eldercare" />}
        {view === "doctor" && <DoctorSearchView />}
        {view === "verification" && <ServiceDetailView category="verification" />}
        {view === "bookings" && <MyBookingsView />}
        {view === "documents" && <MyDocumentsView />}
        {view === "caregiver-profile" && <CaregiverProfileView />}
        {view === "doctor-console" && <DoctorConsoleView />}
      </main>
      <Footer />
      <BottomNav />
      <BookingModal key={bookingSessionId} />
      <VideoCallView />
    </div>
  );
}
