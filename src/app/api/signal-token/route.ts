import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SIGNAL_JWT_SECRET ?? ""
);

// Customer app doesn't have auth yet — issue a short-lived JWT
// with a random customer ID. This only allows signaling (socket
// connection), not data access. When we add customer auth, this
// should verify the session first.
export async function GET() {
  if (!SECRET.length) {
    return NextResponse.json({ error: "Signal JWT secret not configured" }, { status: 500 });
  }

  const customerId = `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const token = await new SignJWT({ id: customerId, role: "customer" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("nurturee")
    .setExpirationTime("1h")
    .sign(SECRET);

  return NextResponse.json({ token });
}
