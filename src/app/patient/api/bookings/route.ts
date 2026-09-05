import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPatientSession } from '@/lib/patient-auth';
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const s: any = await getPatientSession(req);
    if (!s) return NextResponse.json(
      { error:'Please sign in first.' }, { status:401 });
    const { serviceId, doctorId, bookingType,
      consultationMode, date, startTime, notes } = await req.json();
    if (!serviceId||!doctorId||!date||!startTime)
      return NextResponse.json(
        { error:'Doctor, date, time required.' }, { status:400 });
    const doc = await prisma.doctor.findFirst(
      { where:{ id:doctorId, isBlocked:false } });
    if (!doc) return NextResponse.json(
      { error:"Doctor unavailable. Pick another?" }, { status:400 });
    const fee = consultationMode==='online'
      ? (doc.feeOnline||0) : (doc.feeAtHome||0);
    const n = await prisma.booking.count();
    const booking = await prisma.booking.create({ data:{
      bookingId:`NUR-${String(n+1).padStart(4,'0')}`,
      patientId:s.patientId, doctorId, serviceId,
      bookingType:bookingType||'consultation',
      consultationMode:consultationMode||'in_home',
      status:'pending', date, startTime,
      patientName:s.name||'', patientPhone:s.phone||'',
      address:s.address||null, city:s.city||null,
      pincode:s.pincode||null, notes:notes||null,
      totalAmount:fee,
      doctorEarnings:fee*(1-(doc.commissionRate||15)/100),
      commissionAmount:fee*(doc.commissionRate||15)/100,
    }});
    return NextResponse.json({ booking,
      message:"Booked! Doctor will confirm shortly." });
  } catch(e) { console.error('[book POST]',e);
    return NextResponse.json({ error:'Booking failed.' },{ status:500 }); }
}
export async function GET(req: NextRequest) {
  try {
    const s: any = await getPatientSession(req);
    if (!s) return NextResponse.json(
      { error:'Please sign in first.' }, { status:401 });
    const st = new URL(req.url).searchParams.get('status');
    const w:any = { patientId:s.patientId };
    if (st) w.status = st;
    const bookings = await prisma.booking.findMany({
      where:w, orderBy:{ createdAt:'desc' },
      include:{
        doctor:{ select:{ id:true,name:true,specialty:true,avatar:true }},
        service:{ select:{ id:true,name:true,category:true }},
    }});
    return NextResponse.json({ bookings });
  } catch(e) { console.error('[book GET]',e);
    return NextResponse.json({ error:"Could not load bookings." },{ status:500 }); }
}