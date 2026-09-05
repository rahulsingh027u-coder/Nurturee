import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { verifyOtp, generateUhid, createPatientToken, setAuthCookie } from '@/lib/patient-auth';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(req: NextRequest) {
  try {
    const { phone, email, otp, name, password } = await req.json();
    const identifier = phone || email;
    if (!identifier || !otp) return NextResponse.json({ success: false, message: 'Missing required fields.' }, { status: 400 });
    const result: any = await verifyOtp(identifier, otp);
    if (!result.valid) return NextResponse.json({ success: false, message: result.error, remainingAttempts: result.remainingAttempts }, { status: 401 });
    let patient = phone ? await prisma.patient.findFirst({ where: { phone } }) : await prisma.patient.findFirst({ where: { email } });
    let isNewUser = false;
    if (!patient) {
      isNewUser = true;
      patient = await prisma.patient.create({ data: { phone: phone || null, email: email || null, uhid: await generateUhid(), name: name || 'Patient', password: password ? await bcrypt.hash(password, 10) : null } });
    } else {
      if (name && !patient.name) patient = await prisma.patient.update({ where: { id: patient.id }, data: { name } });
      if (password) patient = await prisma.patient.update({ where: { id: patient.id }, data: { password: await bcrypt.hash(password, 10) } });
    }
    const token = await createPatientToken({ patientId: patient.id, phone: patient.phone || undefined, email: patient.email || undefined, uhid: patient.uhid, name: patient.name || undefined });
    await setAuthCookie(token);
    return NextResponse.json({ success: true, isNewUser, hasPassword: !!patient.password, patient: { id: patient.id, phone: patient.phone, email: patient.email, uhid: patient.uhid, name: patient.name } });
  } catch (error) { console.error('Verify OTP error:', error); return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 }); }
}
