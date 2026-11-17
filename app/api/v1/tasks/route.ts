import { NextRequest, NextResponse } from "next/server";
import { V4_SEED_TASKS } from "@/lib/demo/v4SeedData";

export async function GET() {
  return NextResponse.json({
    status: "success",
    count: V4_SEED_TASKS.length,
    tasks: V4_SEED_TASKS,
  });
}
