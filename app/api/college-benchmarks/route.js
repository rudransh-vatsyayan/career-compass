import { NextResponse } from "next/server";
import { getCollegeBenchmarkDataset } from "@/lib/collegeBenchmarks";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getCollegeBenchmarkDataset());
  } catch (error) {
    console.error("College benchmarks API error:", error);
    return NextResponse.json(
      { error: "Failed to load college benchmark dataset", details: error.message },
      { status: 500 }
    );
  }
}
