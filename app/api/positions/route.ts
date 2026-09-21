import { NextResponse } from "next/server";
import { getOpenPositions } from "@/lib/google/sheets";
import { withShortCache } from "@/lib/cache/shortCache";
import type { PositionsResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await withShortCache("open-positions", getOpenPositions);
    const body: PositionsResponse = {
      positions: rows.map((row) => ({
        title: row.title,
        salary: row.salary,
        jobDescription: row.jobDescription,
      })),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[GET /api/positions] failed to load positions", error);
    return NextResponse.json(
      { message: "Unable to load open positions right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
