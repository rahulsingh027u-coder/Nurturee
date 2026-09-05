import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
 * GET /patient/api/doctors
 *
 * Shows patients which doctors they can pick from.
 * Blocked doctors are hidden so patients only
 * see active, available options.
 */
export async function GET() {
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isBlocked: false },
      select: {
        id: true, name: true, specialty: true,
        qualifications: true, experience: true,
        languages: true, avatar: true, bio: true,
        feeOnline: true, feeAtHome: true, isOnline: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ doctors });
  } catch (err) {
    console.error('[doctors listing]', err);
    return NextResponse.json(
      { error: "Couldn't load our doctors right now. Hang tight and try again." },
      { status: 500 },
    );
  }
}
