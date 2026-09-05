import { NextResponse } from 'next/server';
import { getPatientSession } from '@/lib/patient-auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getPatientSession();
    if (!session) return NextResponse.json({ success: false, authenticated: false });
    const patient = await db.patient.findUnique({ where: { id: (session as any).id }, select: { id: true, uhid: true, phone: true, name: true, email: true, age: true, gender: true, bloodGroup: true, city: true } });
    if (!patient) return NextResponse.json({ success: false, authenticated: false });
    return NextResponse.json({ success: true, authenticated: true, patient });
  } catch (error) { console.error('[session] Error:', error); return NextResponse.json({ success: false, authenticated: false }, { status: 500 }); }
}
