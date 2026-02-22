"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/permissions";
import { ok, err, type ApiResponse } from "@/lib/api-response";

async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) return null;
  const member = await db.member.findFirst({
    where: { user_id: session.user.id, is_active: true },
  });
  if (!member) return null;
  return { session, member };
}

export type TaskInsightsRow = {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  workingSeconds: number;
  spentAmount: number;
  billableAmount: number;
  profitPct: number;
};

export type TaskInsightsClientGroup = {
  clientId: string | null;
  clientName: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  tasks: TaskInsightsRow[];
};

export type TaskInsightsSummary = {
  totalTasks: number;
  totalProjects: number;
  totalWorkingSeconds: number;
  totalSpentAmount: number;
  totalBillableAmount: number;
  avgProfitPct: number;
};

export type TaskInsightsData = {
  summary: TaskInsightsSummary;
  groups: TaskInsightsClientGroup[];
};

export async function getTaskInsightsData(params: {
  startDate?: string;
  endDate?: string;
  roleFilter?: string;
  employeeId?: string;
  projectId?: string;
}): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  const orgId = ctx.member.organization_id;
  const isManager = ["OWNER", "ADMIN", "MANAGER"].includes(ctx.member.role);

  try {
    // Fetch all active members to get hourly rates for cost calculation
    const allMembers = await db.member.findMany({
      where: { organization_id: orgId, is_active: true },
      select: { user_id: true, hourly_rate: true },
    });
    const memberRateMap = new Map<string, number>();
    for (const m of allMembers) {
      memberRateMap.set(m.user_id, m.hourly_rate ? Number(m.hourly_rate) : 0);
    }

    // Fetch all tasks in org projects (with project + client)
    const taskWhere: Record<string, unknown> = {
      deleted_at: null,
      project: {
        organization_id: orgId,
        deleted_at: null,
        ...(params.projectId ? { id: params.projectId } : {}),
      },
    };

    const tasks = await db.task.findMany({
      where: taskWhere,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            hourly_rate: true,
            is_billable: true,
            client: { select: { id: true, name: true, company: true } },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    if (tasks.length === 0) {
      return ok({
        summary: {
          totalTasks: 0,
          totalProjects: 0,
          totalWorkingSeconds: 0,
          totalSpentAmount: 0,
          totalBillableAmount: 0,
          avgProfitPct: 0,
        },
        groups: [],
      } as TaskInsightsData);
    }

    const taskIds = tasks.map((t) => t.id);

    // Fetch time entries for these tasks within date range
    const timeEntryWhere: Record<string, unknown> = {
      task_id: { in: taskIds },
      end_time: { not: null },
    };
    if (params.startDate) {
      timeEntryWhere.start_time = {
        ...(timeEntryWhere.start_time as object || {}),
        gte: new Date(params.startDate),
      };
    }
    if (params.endDate) {
      timeEntryWhere.start_time = {
        ...(timeEntryWhere.start_time as object || {}),
        lte: new Date(params.endDate),
      };
    }
    if (!isManager) {
      timeEntryWhere.user_id = ctx.session.user.id;
    } else if (params.employeeId) {
      timeEntryWhere.user_id = params.employeeId;
    }

    const timeEntries = await db.timeEntry.findMany({
      where: timeEntryWhere,
      select: {
        task_id: true,
        user_id: true,
        duration: true,
        is_billable: true,
      },
    });

    // Group time entries by task_id
    const entriesByTask = new Map<string, typeof timeEntries>();
    for (const e of timeEntries) {
      if (!e.task_id) continue;
      if (!entriesByTask.has(e.task_id)) entriesByTask.set(e.task_id, []);
      entriesByTask.get(e.task_id)!.push(e);
    }

    // Build per-task rows
    const taskRows = new Map<string, TaskInsightsRow>();
    for (const task of tasks) {
      const entries = entriesByTask.get(task.id) || [];
      const workingSeconds = entries.reduce((s, e) => s + (e.duration || 0), 0);

      // Spent = sum of (duration_hours × member_hourly_rate) per entry
      const spentAmount = entries.reduce((s, e) => {
        const rate = memberRateMap.get(e.user_id) || 0;
        return s + ((e.duration || 0) / 3600) * rate;
      }, 0);

      // Billable = sum of (duration_hours × project_hourly_rate) for billable entries
      const projectRate = task.project.hourly_rate ? Number(task.project.hourly_rate) : 0;
      const billableAmount = entries.reduce((s, e) => {
        if (!e.is_billable || !task.project.is_billable) return s;
        return s + ((e.duration || 0) / 3600) * projectRate;
      }, 0);

      // Profit % = ((billable - spent) / billable) * 100, capped at 999
      const profitPct = billableAmount > 0
        ? Math.round(((billableAmount - spentAmount) / billableAmount) * 100)
        : 0;

      taskRows.set(task.id, {
        taskId: task.id,
        taskTitle: task.title,
        taskStatus: task.status,
        workingSeconds,
        spentAmount: Math.round(spentAmount * 100) / 100,
        billableAmount: Math.round(billableAmount * 100) / 100,
        profitPct,
      });
    }

    // Group tasks by project (which links to client)
    const projectMap = new Map<string, {
      clientId: string | null;
      clientName: string;
      projectId: string;
      projectName: string;
      projectColor: string;
      taskIds: string[];
    }>();

    for (const task of tasks) {
      const pid = task.project_id;
      if (!projectMap.has(pid)) {
        const client = task.project.client;
        projectMap.set(pid, {
          clientId: client?.id ?? null,
          clientName: client?.company || client?.name || task.project.name,
          projectId: pid,
          projectName: task.project.name,
          projectColor: task.project.color,
          taskIds: [],
        });
      }
      projectMap.get(pid)!.taskIds.push(task.id);
    }

    // Build groups — only include projects that have tasks with time entries (or all tasks)
    const groups: TaskInsightsClientGroup[] = [];
    for (const [, proj] of projectMap) {
      const taskRowsForProject = proj.taskIds
        .map((tid) => taskRows.get(tid))
        .filter((r): r is TaskInsightsRow => r !== undefined);

      if (taskRowsForProject.length === 0) continue;

      groups.push({
        clientId: proj.clientId,
        clientName: proj.clientName,
        projectId: proj.projectId,
        projectName: proj.projectName,
        projectColor: proj.projectColor,
        tasks: taskRowsForProject,
      });
    }

    // Summary totals
    const allRows = Array.from(taskRows.values());
    const totalWorkingSeconds = allRows.reduce((s, r) => s + r.workingSeconds, 0);
    const totalSpentAmount = allRows.reduce((s, r) => s + r.spentAmount, 0);
    const totalBillableAmount = allRows.reduce((s, r) => s + r.billableAmount, 0);
    const avgProfitPct = totalBillableAmount > 0
      ? Math.round(((totalBillableAmount - totalSpentAmount) / totalBillableAmount) * 100)
      : 0;
    const projectsWithTasks = new Set(tasks.map((t) => t.project_id));

    return ok({
      summary: {
        totalTasks: allRows.length,
        totalProjects: projectsWithTasks.size,
        totalWorkingSeconds,
        totalSpentAmount: Math.round(totalSpentAmount * 100) / 100,
        totalBillableAmount: Math.round(totalBillableAmount * 100) / 100,
        avgProfitPct,
      },
      groups,
    } as TaskInsightsData);
  } catch (error) {
    console.error("[getTaskInsightsData]", error);
    return err("Failed to fetch task insights data");
  }
}

// Reuse project list from existing actions
export async function getTaskInsightsProjects(): Promise<ApiResponse> {
  const ctx = await getAuthContext();
  if (!ctx) return err("Unauthorized");

  try {
    const projects = await db.project.findMany({
      where: { organization_id: ctx.member.organization_id, deleted_at: null },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    });
    return ok(projects);
  } catch (error) {
    console.error("[getTaskInsightsProjects]", error);
    return err("Failed to fetch projects");
  }
}
