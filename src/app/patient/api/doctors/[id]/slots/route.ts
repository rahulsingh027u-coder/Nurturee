import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// GET /patient/api/doctors/[id]/slots?date=2026-09-05
export async function GET(req: NextRequest,
  { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: did } = await params;
    const ds = new URL(req.url).searchParams.get('date');
    if (!ds) return NextResponse.json(
      { error:'Pick a date first.' }, { status:400 });
    const dow = new Date(ds+'T00:00:00').getDay();
    if (dow===0) return NextResponse.json(
      { slots:[], message:"No visits on Sundays." });
    const sch = await prisma.doctorSchedule.findFirst(
      { where:{ doctorId:did, dayOfWeek:dow, isAvailable:true } });
    if (!sch) return NextResponse.json(
      { slots:[], message:"Doctor unavailable that day." });
    const bk = await prisma.booking.findMany({
      where:{ doctorId:did, date:ds,
        status:{ in:['pending','confirmed','in_progress'] } },
      select:{ startTime:true } });
    const taken = new Set(bk.map(b=>b.startTime));
    const slots:string[]=[];
    const [sH,sM]=sch.startTime.split(':').map(Number);
    const [eH,eM]=sch.endTime.split(':').map(Number);
    const dur=sch.slotDuration||60;
    let cur=sH*60+sM; const end=eH*60+eM;
    while (cur+dur<=end) {
      const h=Math.floor(cur/60),m=cur%60,p=h>=12?'PM':'AM';
      const dh=h===0?12:h>12?h-12:h;
      const t=`${String(dh).padStart(2,'0')}:${String(m).padStart(2,'0')} ${p}`;
      if (!taken.has(t)) slots.push(t);
      cur+=dur; if (slots.length>=sch.maxPatients) break; }
    return NextResponse.json({ slots, scheduleId:sch.id });
  } catch(e) { console.error('[slots]',e);
    return NextResponse.json({ error:"Error checking slots." },{ status:500 }); }
}