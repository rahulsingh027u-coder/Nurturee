'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuthStore } from '@/store/patient-auth-store';
import { Loader2, LogOut, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PatientDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout, fetchSession } = usePatientAuthStore();
  useEffect(() => { fetchSession(); }, [fetchSession]);
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/patient/login'); }, [isLoading, isAuthenticated, router]);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>;
  if (!user) return null;
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Nurturee</h1>
          <Button variant="ghost" size="sm" onClick={() => { logout(); router.push('/patient/login'); }} className="text-gray-500 hover:text-red-600"><LogOut className="w-4 h-4 mr-1" /> Logout</Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8"><h2 className="text-2xl font-bold text-gray-900">Welcome{user.name ? ', ' + user.name : ''}</h2><p className="text-gray-500 mt-1">Your health journey, simplified.</p></div>
        <Card className="mb-6"><CardHeader><CardTitle className="text-base">Your Profile</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-center gap-3"><User className="w-4 h-4 text-gray-400" /><span className="text-sm"><span className="text-gray-500">UHID:</span> <span className="font-mono font-medium">{user.uhid}</span></span></div><div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400" /><span className="text-sm"><span className="text-gray-500">Phone:</span> <span className="font-medium">+91 {user.phone}</span></span></div></CardContent></Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card className="border-dashed border-2 border-gray-200 bg-white/50"><CardContent className="py-12 text-center text-gray-400"><p className="text-sm">Book a Service</p><p className="text-xs mt-1">Coming soon</p></CardContent></Card><Card className="border-dashed border-2 border-gray-200 bg-white/50"><CardContent className="py-12 text-center text-gray-400"><p className="text-sm">My Appointments</p><p className="text-xs mt-1">Coming soon</p></CardContent></Card></div>
      </main>
    </div>
  );
}
