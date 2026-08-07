import { NextRequest, NextResponse } from "next/server";
import { ingestOrders, type RawOrder } from "@/lib/privateStore";

// Receives POSTs from a LOCAL albiondata-client:
//   albiondata-client.exe -i http://127.0.0.1:3000/api/ingest
// The client posts to /api/ingest/marketorders.ingest (and other topics).
// Nothing here uploads anywhere — data is kept on this machine only.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { topic: string[] } }) {
  const topic = (params.topic || []).join("/");
  try {
    const body = (await req.json()) as { Orders?: RawOrder[] };
    if (topic.includes("marketorders") && Array.isArray(body.Orders)) {
      const n = ingestOrders(body.Orders);
      return NextResponse.json({ ok: true, ingested: n });
    }
    // markethistories / goldprices / mapdata — accepted but not stored (yet).
    return NextResponse.json({ ok: true, ignored: topic });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}

// Some clients probe with GET first; respond OK so they proceed to POST.
export async function GET() {
  return NextResponse.json({ ok: true, ingest: "ready" });
}
