import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPatientSession } from '@/lib/patient-auth';
const prisma = new PrismaClient();

export async function PATCH(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const s: any = await getPatientSession(req);
    if (!s) return NextResponse.json(
      { error:'Sign in first.' }, { status:401 });
    const { id } = await params;
    const { status } = await req.json();
    if (status!=='cancelled') return NextResponse.json(
      { error:"Only cancel allowed." }, { status:403 });
    const b = await prisma.booking.findUnique({ where:{ id } });
    if (!b) return NextResponse.json(
      { error:'Not found.' }, { status:404 });
    if (b.patientId!==s.patientId) return NextResponse.json(
      { error:"Not yours." }, { status:403 });
    if (!['pending','confirmed'].includes(b.status))
      return NextResponse.json(
        { error:"Can't cancel — already "+b.status }, { status:400 });
    const u = await prisma.booking.update({ where:{ id },
      data:{ status:'cancelled' } });
    return NextResponse.json({ booking:u,
      message:"Cancelled. You can rebook anytime." });
  } catch(e) { console.error('[cancel]',e);
    return NextResponse.json({ error:"Cancel failed." },{ status:500 }); }
}