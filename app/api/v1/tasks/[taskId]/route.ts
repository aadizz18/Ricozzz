import { NextRequest, NextResponse } from "next/server";
import { V4_SEED_TASKS } from "@/lib/demo/v4SeedData";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await req.json();

    const task = V4_SEED_TASKS.find((t) => t.taskId === taskId);

    const updatedTask = {
      ...(task || { taskId, title: `Task ${taskId}`, department: "Operations" }),
      assigneeId: body.assigned_to || task?.assigneeId,
      status: body.status ? body.status.toLowerCase() : task?.status,
      blockerNote: body.blocker_reason || task?.blockerNote,
      isBlocked: Boolean(body.blocker_flag),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "success",
      taskId,
      task: updatedTask,
      message: `Task ${taskId} successfully updated via V1 API.`,
    });
  } catch (error: any) {
    console.error("V1 Tasks PATCH error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
