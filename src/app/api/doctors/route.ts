import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const specialization = url.searchParams.get("specialization") || "";
    const area = url.searchParams.get("area") || "";
    const sort = url.searchParams.get("sort") || "";

    const where: any = { isBlocked: false, verified: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { specialty: { contains: search, mode: "insensitive" } },
        { area: { contains: search, mode: "insensitive" } },
      ];
    }
    if (specialization) {
      where.specialty = { contains: specialization, mode: "insensitive" };
    }
    if (area) {
      where.area = { contains: area, mode: "insensitive" };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "experience") orderBy = { experience: "desc" };
    if (sort === "fee-low") orderBy = { feeOnline: "asc" };
    if (sort === "fee-high") orderBy = { feeOnline: "desc" };

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy,
      take: 50,
      select: {
        id: true,
        name: true,
        phone: true,
        specialty: true,
        qualifications: true,
        experience: true,
        languages: true,
        area: true,
        avatar: true,
        bio: true,
        feeOnline: true,
        feeAtHome: true,
        isOnline: true,
        avgRating: true,
      },
    });

    const formatted = doctors.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      avatar: d.avatar,
      specialization: d.specialty,
      degree: d.qualifications,
      experienceYears: d.experience,
      feeOnline: d.feeOnline,
      inHomeFee: d.feeAtHome,
      area: d.area,
      languages: typeof d.languages === "string" ? JSON.parse(d.languages || "[]") : d.languages,
      availableDays: "1,2,3,4,5,6",
      availableFrom: "09:00",
      availableTo: "21:00",
      bio: d.bio,
      practiceType: null,
      isOnline: d.isOnline,
      rating: d.avgRating || 0,
    }));

    return NextResponse.json({ doctors: formatted });
  } catch (error: any) {
    console.error("Doctors API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
