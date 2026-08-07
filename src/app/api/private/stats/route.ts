import { NextResponse } from "next/server";
import { privateStats } from "@/lib/privateStore";

// Lightweight endpoint for polling private-capture status (no AODP call).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(privateStats());
}
