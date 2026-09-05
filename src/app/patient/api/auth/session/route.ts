import { NextRequest, NextResponse } from 'next/server';
import { getPatientSession } from '@/lib/patient-auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getPatientSession(req);
    if (!session) return NextResponse.json({ success: false, authenticated: false });
    
    // Look up the patient by phone (from the JWT session)
    const patient = await prisma.patient.findFirst({
      where: { phone: session.phone },
      select: { id: true, uhid: true, phone: true, name: true, email: true, age: true, gender: true, bloodGroup: true, city: true }
    });
    
    if (!patient) return NextResponse.json({ success: false, authenticated: false });
    
    return NextResponse.json({ success: true, authenticated: true, patient });
  } catch (error) {
    console.error('[session] Error:', error);
    return NextResponse.json({ success: false, authenticated: false }, { status: 500 });
  }
}
