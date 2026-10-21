import { NextRequest, NextResponse } from 'next/server';
import { sendOtp } from '@/lib/patient-auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, email } = await req.json();
    const identifier = phone || email;
    if (!identifier) return NextResponse.json({ success: false, message: 'Phone number or email is required.' }, { status: 400 });
    if (phone && !/^\d{10}$/.test(phone)) return NextResponse.json({ success: false, message: 'Please enter a valid 10-digit phone number.' }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });

    const result: any = await sendOtp(identifier);
    if (!result.success) return NextResponse.json({ success: false, message: result.error, retryAfter: result.retryAfter }, { status: 429 });

    const response: Record<string, unknown> = { success: true };
    // devOtp response removed for security
    if (result.retryAfter) response.retryAfter = result.retryAfter;
    return NextResponse.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
