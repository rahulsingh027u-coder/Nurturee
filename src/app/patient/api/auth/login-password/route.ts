import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createPatientToken, setAuthCookie } from '@/lib/patient-auth';
const prisma = new PrismaClient();
export async function POST(req: NextRequest) {
  try {
    const { phone, email, password } = await req.json();
    if (!password) return NextResponse.json({ success: false, message: 'Password is required.' }, { status: 400 });
    const patient = phone ? await prisma.patient.findFirst({ where: { phone } }) : email ? await prisma.patient.findFirst({ where: { email } }) : null;
    if (!patient || !patient.password) return NextResponse.json({ success: false, message: 'No account found or no password set. Please use OTP login.' }, { status: 401 });
    const valid = await bcrypt.compare(password, patient.password);
    if (!valid) return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
    const token = await createPatientToken({ patientId: patient.id, phone: patient.phone || undefined, email: patient.email || undefined, uhid: patient.uhid, name: patient.name || undefined });
    await setAuthCookie(token);
    return NextResponse.json({ success: true, patient: { id: patient.id, phone: patient.phone, email: patient.email, uhid: patient.uhid, name: patient.name } });
  } catch (error) { console.error('Password login error:', error); return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 }); }
}
