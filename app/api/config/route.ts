import { NextResponse } from "next/server";
import { getActiveLinesOfBusiness } from "@/lib/google/sheets";
import { withShortCache } from "@/lib/cache/shortCache";
import type { ConfigResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const linesOfBusiness = await withShortCache("lines-of-business", getActiveLinesOfBusiness);
    const body: ConfigResponse = { linesOfBusiness };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[GET /api/config] failed to load config", error);
    return NextResponse.json(
      { message: "Unable to load the application form right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
