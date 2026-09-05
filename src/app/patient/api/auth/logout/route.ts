import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/patient-auth';

export async function POST() {
  try { await clearAuthCookie(); return NextResponse.json({ success: true, message: 'Logged out.' }); } catch { return NextResponse.json({ success: false, message: 'Error.' }, { status: 500 }); }
}
