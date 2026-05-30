import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), "college_students_skills_vs_placement_reality.csv");
    const csvText = fs.readFileSync(csvPath, "utf8");

    return new Response(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Placement data API error:", error);
    return Response.json(
      { error: "Failed to load placement data", details: error.message },
      { status: 500 }
    );
  }
}
