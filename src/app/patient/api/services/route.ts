import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
 * GET /patient/api/services
 *
 * Returns every service a patient can book.
 * The frontend uses these as "visit type" cards.
 */
export async function GET() {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true, name: true, category: true,
        description: true, duration: true,
        priceOnline: true, priceAtHome: true, price: true,
      },
      orderBy: { category: 'asc' },
    });
    return NextResponse.json({ services });
  } catch (err) {
    console.error('[services listing]', err);
    return NextResponse.json(
      { error: "Couldn't load our services. Give it another try." },
      { status: 500 },
    );
  }
}
