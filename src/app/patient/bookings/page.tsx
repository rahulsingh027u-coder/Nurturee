'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuthStore } from '@/store/patient-auth-store';
import {
  Calendar, Clock, User, IndianRupee, LogOut, Plus,
  Loader2, X, RefreshCw, ChevronRight, CheckCircle2,
  XCircle, Timer, PlayCircle, MapPin, Phone, Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/* ── friendly time formatter ── */
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

/* ── status badge with warm colors ── */
function StatusBadge({ status }) {
  const styles = {
    pending:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  Icon: Timer },
    confirmed:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   Icon: CheckCircle2 },
    in_progress: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', Icon: PlayCircle },
    completed:   { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  Icon: CheckCircle2 },
    cancelled:   { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-200',    Icon: XCircle },
  };
  const s = styles[status] || styles.pending;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── consultation mode label ── */
function ModeLabel({ mode }) {
  if (mode === 'online') {
    return <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Video Call</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Home Visit</span>;
}

export default function PatientBookingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, fetchSession } = usePatientAuthStore();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => { fetchSession(); }, [fetchSession]);
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/patient/login');
  }, [isLoading, isAuthenticated, router]);

  /* grab all bookings for this patient */
  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/patient/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      } else {
        setError('Could not load bookings right now.');
      }
    } catch {
      setError('Network issue — please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  /* cancel a booking */
  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(selectedBooking.id);
    try {
      const res = await fetch(`/patient/api/bookings/${selectedBooking.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        setShowCancelModal(false);
        setSelectedBooking(null);
        loadBookings();
      } else {
        const d = await res.json();
        setError(d.error || 'Could not cancel this booking.');
      }
    } catch {
      setError('Network issue — please try again.');
    } finally {
      setCancelling(null);
    }
  };

  const openCancelModal = (b) => { setSelectedBooking(b); setShowCancelModal(true); setError(''); };
  const canCancel = (status) => status === 'pending' || status === 'confirmed';

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const counts = { all: bookings.length, pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
  bookings.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/patient')} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">My Bookings</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadBookings} disabled={loading} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.push('/patient/login'); }}
              className="text-gray-500 hover:text-red-600">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* ── error banner ── */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── filter tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {[
            { k: 'all', l: 'All' },
            { k: 'pending', l: 'Pending' },
            { k: 'confirmed', l: 'Confirmed' },
            { k: 'in_progress', l: 'In Progress' },
            { k: 'completed', l: 'Completed' },
            { k: 'cancelled', l: 'Cancelled' },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition
                ${filter === f.k
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f.l}{f.k !== 'all' && counts[f.k] > 0 ? ` (${counts[f.k]})` : ''}
            </button>
          ))}
        </div>

        {/* ── bookings list ── */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Fetching your bookings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Stethoscope className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No bookings yet{filter !== 'all' ? ' in this category' : ''}</p>
            <Button onClick={() => router.push('/patient/book')} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-1.5" />Book a Visit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <Card key={b.id} className="border-gray-100 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  {/* top row: booking id + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-[11px] text-gray-400">{b.bookingId}</p>
                      <p className="font-semibold text-gray-900 mt-0.5 text-[15px]">
                        {b.service?.name || b.bookingType}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  {/* doctor info with avatar */}
                  {b.doctor && (
                    <div className="flex items-center gap-2.5 mb-3 p-2.5 bg-gray-50 rounded-lg">
                      {b.doctor.avatar ? (
                        <img src={b.doctor.avatar} alt={b.doctor.name}
                          className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {b.doctor.name?.charAt(0)?.toUpperCase() || 'D'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.doctor.name}</p>
                        <p className="text-xs text-gray-500">{b.doctor.specialty || 'Doctor'}</p>
                      </div>
                    </div>
                  )}

                  {/* details grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{b.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{fmtTime(b.startTime)}{b.endTime ? ' - ' + fmtTime(b.endTime) : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{b.consultationMode === 'online' ? 'Online' : (b.address || 'Home Visit')}</span>
                    </div>
                    {b.totalAmount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{b.totalAmount}</span>
                      </div>
                    )}
                  </div>

                  {/* mode badge */}
                  {b.consultationMode && <div className="mb-3"><ModeLabel mode={b.consultationMode} /></div>}

                  {/* cancel button for pending/confirmed */}
                  {canCancel(b.status) && (
                    <button onClick={() => openCancelModal(b)}
                      className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition">
                      Cancel Booking
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── floating book button ── */}
        <button onClick={() => router.push('/patient/book')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105">
          <Plus className="w-6 h-6" />
        </button>
      </main>

      {/* ── cancel confirmation modal ── */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your {selectedBooking.service?.name || 'appointment'} on {selectedBooking.date} at {fmtTime(selectedBooking.startTime)} will be cancelled.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                Keep It
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-1.5">
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
