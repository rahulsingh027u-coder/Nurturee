import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPatientSession } from '@/lib/patient-auth';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// POST /patient/api/auth/set-password — set/update patient password
// Uses the existing session cookie (already authenticated from verify-otp)
// instead of calling verify-otp again (which would fail because the OTP was deleted).
export async function POST(req: NextRequest) {
  try {
    const session = await getPatientSession(req);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.patient.update({
      where: { id: session.patientId },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
