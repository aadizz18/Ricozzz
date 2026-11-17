import { NextRequest, NextResponse } from "next/server";
import { trainModelOnPretrainedData, getAllModelTrainingMetrics } from "@/lib/ai/mlEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const modelKey = body.modelKey;
    const epochs = body.epochs || 25;

    if (modelKey) {
      const metric = trainModelOnPretrainedData(modelKey, epochs);
      return NextResponse.json({
        success: true,
        message: `Model ${modelKey} trained successfully on pre-trained operations dataset across ${epochs} epochs.`,
        metrics: metric,
      });
    }

    const allMetrics = getAllModelTrainingMetrics();
    return NextResponse.json({
      success: true,
      message: "All 4 SHAP & predictive intelligence models retrained on pre-trained operational data.",
      metrics: allMetrics,
    });
  } catch (error: any) {
    console.error("AI train-models error:", error);
    return NextResponse.json(
      { error: "Model training execution failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const metrics = getAllModelTrainingMetrics();
  return NextResponse.json({
    success: true,
    metrics,
  });
}
