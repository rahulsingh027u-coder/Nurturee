import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Handle Prisma singleton across hot-reloads in dev
const prisma = (globalThis as any).__prismaSingleton ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__prismaSingleton = prisma;
}

/*
 * GET /patient/api/doctors
 *
 * Returns every verified doctor a patient can book.
 * Maps Prisma columns to BOTH the DB names (for /patient/book/page.tsx)
 * AND the frontend Doctor type names (for BookingModal.tsx), so both work.
 */
export async function GET() {
  try {
    const rows = await prisma.doctor.findMany({
      where: { verified: true },
      select: {
        id: true, name: true, specialty: true,
        qualifications: true, experience: true,
        languages: true, avatar: true, bio: true,
        feeOnline: true, feeAtHome: true, isOnline: true,
      },
      orderBy: { name: 'asc' },
    });

    // Map to frontend Doctor type (src/lib/types.ts) while keeping DB names too
    const doctors = rows.map((d) => ({
      // DB names (used by /patient/book/page.tsx)
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      qualifications: d.qualifications,
      experience: d.experience,
      languages: d.languages,
      avatar: d.avatar,
      bio: d.bio,
      feeOnline: d.feeOnline,
      feeAtHome: d.feeAtHome,
      isOnline: d.isOnline,
      // Frontend Doctor type names (used by BookingModal.tsx)
      specialization: d.specialty,
      experienceYears: d.experience,
      onlineFee: d.feeOnline,
      inHomeFee: d.feeAtHome,
      // Fields the type expects but DB doesn't have — safe defaults
      serviceIds: [] as string[],
      area: 'Gurugram',
      clinicAddress: '',
    }));

    return NextResponse.json({ doctors });
  } catch (err) {
    console.error('[doctors listing]', err);
    return NextResponse.json(
      { error: "Couldn't load our doctors right now. Hang tight and try again." },
      { status: 500 },
    );
  }
}
