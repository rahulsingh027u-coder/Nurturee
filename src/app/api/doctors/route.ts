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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let whereParts: string[] = ['dp."isActive" = true', 'dp."profileComplete" = true'];
    let paramIdx = 1;
    const values: any[] = [];

    if (search) {
      whereParts.push(
        "(u.name ILIKE $" + paramIdx + " OR dp.specialization ILIKE $" + paramIdx + " OR dp.area ILIKE $" + paramIdx + ")"
      );
      values.push("%" + search + "%");
      paramIdx++;
    }

    if (specialization) {
      whereParts.push("dp.specialization ILIKE $" + paramIdx);
      values.push("%" + specialization + "%");
      paramIdx++;
    }

    if (area) {
      whereParts.push("dp.area ILIKE $" + paramIdx);
      values.push("%" + area + "%");
      paramIdx++;
    }

    const whereSQL = whereParts.join(" AND ");

    let orderBy = 'ORDER BY dp."createdAt" DESC';
    if (sort === "experience") orderBy = 'ORDER BY dp."experienceYears" DESC';
    if (sort === "fee-low") orderBy = 'ORDER BY dp."consultationFeeOnline" ASC';
    if (sort === "fee-high") orderBy = 'ORDER BY dp."consultationFeeOnline" DESC';

    const dataSQL =
      'SELECT dp.id, dp.specialization, dp.degree, dp."experienceYears", dp."consultationFeeOnline", dp."consultationFeeOffline", dp."registrationNo", dp.area, dp.languages, dp."availableDays", dp."availableFrom", dp."availableTo", dp.bio, dp."practiceType", u.name, u.phone, u.avatar FROM "DoctorProfile" dp JOIN "User" u ON dp."userId" = u.id WHERE ' +
      whereSQL +
      " " +
      orderBy +
      " LIMIT " +
      limit +
      " OFFSET " +
      offset;

    const rows: any = await prisma.$queryRawUnsafe(dataSQL, ...values);

    const doctors = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      avatar: r.avatar ? r.avatar.replace("/api", "") : null,
      specialization: r.specialization,
      degree: r.degree,
      experienceYears: r.experienceYears,
      feeOnline: r.consultationFeeOnline,
      inHomeFee: r.consultationFeeOffline,
      area: r.area,
      languages: typeof r.languages === "string" ? r.languages.split(",").map((s:string) => s.trim()) : r.languages,
      availableDays: r.availableDays,
      availableFrom: r.availableFrom,
      availableTo: r.availableTo,
      bio: r.bio,
      practiceType: r.practiceType,
      isOnline: r.practiceType === "online" || r.practiceType === "both",
      rating: 0,
    }));

    return NextResponse.json({ doctors });
  } catch (error: any) {
    console.error("Nurturee doctors API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
