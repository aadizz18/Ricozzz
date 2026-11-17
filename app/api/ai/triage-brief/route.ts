import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enquiryId, briefText, budgetRange, timelineWeeks, companyName, projectTitle } = body;

    const missingFields: string[] = [];
    if (!budgetRange) missingFields.push("budgetRange");
    if (!timelineWeeks) missingFields.push("timelineWeeks");

    const textLength = (briefText || "").trim().length;
    let completenessScore = 100.0;

    if (missingFields.length > 0) completenessScore -= missingFields.length * 25.0;
    if (textLength < 60) completenessScore -= 15.0;
    completenessScore = Math.max(10, Math.min(100, completenessScore));

    const recommendedDisciplines: string[] = [];
    const textLower = `${briefText || ""} ${projectTitle || ""}`.toLowerCase();

    if (textLower.includes("brand") || textLower.includes("logo") || textLower.includes("identity")) {
      recommendedDisciplines.push("brand_identity");
    }
    if (textLower.includes("director") || textLower.includes("overhaul") || textLower.includes("system") || textLower.includes("portal")) {
      recommendedDisciplines.push("creative_director");
    }
    if (textLower.includes("3d") || textLower.includes("motion") || textLower.includes("typography") || textLower.includes("shader")) {
      recommendedDisciplines.push("specialist");
    }
    if (recommendedDisciplines.length === 0) {
      recommendedDisciplines.push("brand_identity");
    }

    let triageSummary = "";
    if (completenessScore < 50.0) {
      triageSummary = `Incomplete brief intake for ${companyName || "Client"}. Missing required financial scope (${missingFields.join(", ")}). Direct promotion to Active Project is paused until parameters are provided.`;
    } else {
      triageSummary = `High-confidence creative brief intake for ${companyName || "Client"}. Recommended talent pod: ${recommendedDisciplines.join(", ")}. Ready for shortlist matching.`;
    }

    return NextResponse.json({
      enquiryId: enquiryId || `enq-${Date.now()}`,
      completenessScore,
      missingFields,
      recommendedDisciplines,
      triageSummary,
    });
  } catch (error: any) {
    console.error("AI triage-brief error:", error);
    return NextResponse.json(
      { error: "Failed to triage client brief", details: error.message },
      { status: 500 }
    );
  }
}
