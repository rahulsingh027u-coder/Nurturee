import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET env var is required"); })()
);

export async function generateOtp(phone: string): Promise<any> {
  // Dev OTP backdoor removed for security
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
  return { success: true, otp };
}

export async function sendOtp(phone: string): Promise<any> {
  const otp = await generateOtp(phone);
  // OTP logging removed for security
  return { success: true, otp };
}

export async function verifyOtp(phone: string, otp: string): Promise<{ valid: boolean; name?: string; error?: string; remainingAttempts?: number }> {
  // Dev OTP verification backdoor removed for security
  const stored = otpStore.get(phone);
  if (!stored) return { valid: false, error: "No OTP requested" };
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return { valid: false, error: "OTP expired" };
  }
  if (stored.otp !== otp) return { valid: false, error: "Wrong OTP" };
  otpStore.delete(phone);
  return { valid: true };
}

export async function generateUhid(): Promise<string> {
  const prefix = "UHID";
  const num = Math.floor(100000 + Math.random() * 900000);
  return prefix + num.toString();
}

export async function createPatientToken(data: any): Promise<string> {
  const token = await new SignJWT({ ...data, role: "patient" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
  return token;
}

export async function setAuthCookie(token: string): Promise<void> {
  const cs = await cookies();
  cs.set("patient_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("patient_token");
}

export async function createSessionToken(phone: string, name: string): Promise<string> {
  const token = await new SignJWT({ phone, name, role: "patient" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
  return token;
}

export async function verifySessionToken(token: string): Promise<{ phone: string; name: string; role: string; patientId?: string; address?: string; city?: string; pincode?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== "patient") return null;
    return { 
      phone: payload.phone as string, 
      name: payload.name as string, 
      role: payload.role as string,
      patientId: payload.patientId as string | undefined,
      address: payload.address as string | undefined,
      city: payload.city as string | undefined,
      pincode: payload.pincode as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function getPatientSession(req?: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get("patient_token")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
