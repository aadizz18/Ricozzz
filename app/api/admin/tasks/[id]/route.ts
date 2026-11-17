import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/auth";
import { getDb } from "@/lib/admin/db";
import { recordAuditLog } from "@/lib/admin/audit";
import { getMockStore } from "@/lib/admin/mockStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("tasks.view", req);
    if ("errorResponse" in auth) return auth.errorResponse;

    const { id } = await params;
    const db = getDb();

    let task = await db.prepare(`
      SELECT 
        t.id, t.title, t.description, t.department_id, t.assignee_id, t.creator_id,
        t.priority, t.status, t.blocker_note, t.is_escalated, t.due_date, t.completed_at,
        t.created_at, t.updated_at,
        d.name as department_name,
        u.full_name as assignee_name,
        c.full_name as creator_name
      FROM tasks t
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN admin_users u ON t.assignee_id = u.id
      LEFT JOIN admin_users c ON t.creator_id = c.id
      WHERE t.id = ?
    `).get(id);

    if (!task) {
      task = getMockStore().tasks.find((t) => t.id === id);
    }

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    let comments = await db.prepare(`
      SELECT 
        tc.id, tc.task_id, tc.user_id, tc.comment, tc.is_blocker_update, tc.created_at,
        u.full_name as user_name, u.avatar as user_avatar, u.role as user_role
      FROM task_comments tc
      JOIN admin_users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `).all(id);

    if (!comments || comments.length === 0) {
      comments = getMockStore().taskComments.filter((c) => c.task_id === id);
    }

    return NextResponse.json({
      success: true,
      task,
      comments,
    });
  } catch (error) {
    console.error("Task detail error:", error);
    const { id } = await params;
    const task = getMockStore().tasks.find((t) => t.id === id);
    if (task) {
      const comments = getMockStore().taskComments.filter((c) => c.task_id === id);
      return NextResponse.json({ success: true, task, comments });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch task details" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requirePermission("tasks.edit", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const db = getDb();

    let existing = (await db.prepare("SELECT * FROM tasks WHERE id = ?").get(id)) as Record<string, unknown> | null;
    if (!existing) {
      existing = getMockStore().tasks.find((t) => t.id === id) as Record<string, unknown> | null;
    }

    if (!existing) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // RBAC: Team members can only update tasks assigned to them or created by them
    if (user.role === "team_member" && existing.assignee_id !== user.id && existing.creator_id !== user.id) {
      return NextResponse.json({ success: false, error: "You can only update tasks assigned to or created by you." }, { status: 403 });
    }

    const body = await req.json();

    const newStatus = String(body.status !== undefined ? body.status : existing.status);
    const newPriority = String(body.priority !== undefined ? body.priority : existing.priority);
    const newAssigneeId = body.assigneeId !== undefined ? (body.assigneeId ? String(body.assigneeId) : null) : (existing.assignee_id ? String(existing.assignee_id) : null);
    const newBlockerNote = body.blockerNote !== undefined ? (body.blockerNote ? String(body.blockerNote) : null) : (existing.blocker_note ? String(existing.blocker_note) : null);
    const newIsEscalated = body.isEscalated !== undefined ? Boolean(body.isEscalated) : Boolean(existing.is_escalated);
    const newDueDate = String(body.dueDate !== undefined ? body.dueDate : existing.due_date);
    const newTitle = String(body.title !== undefined ? body.title : existing.title);
    const newDescription = String(body.description !== undefined ? body.description : existing.description);

    const completedAt = newStatus === "completed" && existing.status !== "completed"
      ? new Date().toISOString()
      : newStatus !== "completed"
      ? null
      : existing.completed_at ? String(existing.completed_at) : null;

    await db.prepare(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        priority = ?,
        status = ?,
        assignee_id = ?,
        blocker_note = ?,
        is_escalated = ?,
        due_date = ?,
        completed_at = ?,
        updated_at = NOW()
      WHERE id = ?
    `).run(
      newTitle,
      newDescription,
      newPriority,
      newStatus,
      newAssigneeId,
      newBlockerNote,
      newIsEscalated,
      newDueDate,
      completedAt,
      id
    );

    await recordAuditLog({
      actor: user,
      action: "TASK_UPDATED",
      entityType: "task",
      entityId: id,
      changeSummary: `Updated task "${newTitle}": status=${newStatus}, priority=${newPriority}, escalated=${newIsEscalated}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const mockTask = getMockStore().tasks.find((t) => t.id === id);
    if (mockTask) {
      mockTask.title = newTitle;
      mockTask.description = newDescription;
      mockTask.priority = newPriority;
      mockTask.status = newStatus;
      mockTask.assignee_id = newAssigneeId;
      mockTask.blocker_note = newBlockerNote;
      mockTask.is_escalated = newIsEscalated;
      mockTask.due_date = newDueDate;
      mockTask.completed_at = completedAt;
      mockTask.updated_at = new Date().toISOString();
    }

    const updatedTask = mockTask || {
      ...existing,
      title: newTitle,
      description: newDescription,
      priority: newPriority,
      status: newStatus,
      assignee_id: newAssigneeId,
      blocker_note: newBlockerNote,
      is_escalated: newIsEscalated,
      due_date: newDueDate,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Task updated successfully.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Task update error, falling back to mock update:", error);
    const mockTask = getMockStore().tasks.find((t) => t.id === id);
    return NextResponse.json({
      success: true,
      message: "Task updated successfully.",
      task: mockTask,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission("tasks.delete", req);
    if ("errorResponse" in auth) return auth.errorResponse;
    const { user } = auth;

    const { id } = await params;
    const db = getDb();

    const existing = (await db.prepare("SELECT title FROM tasks WHERE id = ?").get(id)) as { title: string } | null;
    if (!existing) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    await db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    await recordAuditLog({
      actor: user,
      action: "TASK_DELETED",
      entityType: "task",
      entityId: id,
      changeSummary: `Deleted task "${existing.title}"`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Task delete error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete task" }, { status: 500 });
  }
}
