import { NextRequest } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { jsonErr } from "@/lib/api-response";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { streamChatCompletion } from "@/lib/zai";
import {
  gatherEmployeeMetrics,
  gatherTeamMetrics,
  generateReportNumber,
  buildPrompt,
  buildTeamPrompt,
} from "@/actions/productivity-coach";

export async function POST(request: NextRequest) {
  const { error, session, member } = await authenticateApiRequest();
  if (error) return error;

  if (!["OWNER", "ADMIN", "MANAGER"].includes(member!.role)) {
    return jsonErr("Forbidden", 403);
  }

  if (!process.env.ZAI_API_KEY) {
    return jsonErr("ZAI_API_KEY not configured", 500);
  }

  let body: {
    userId?: string;
    reportType: string;
    startDate: string;
    endDate: string;
  };

  try {
    body = await request.json();
  } catch {
    return jsonErr("Invalid JSON body", 400);
  }

  const { reportType, startDate, endDate } = body;
  const userId = body.userId;

  if (!reportType || !startDate || !endDate) {
    return jsonErr("Missing required fields: reportType, startDate, endDate", 400);
  }

  const validTypes = ["ALL_ANALYSIS", "WORK_PATTERN", "PRODUCTIVITY", "WELLNESS_BURNOUT", "TEAM_OVERVIEW"];
  if (!validTypes.includes(reportType)) {
    return jsonErr(`Invalid reportType. Must be one of: ${validTypes.join(", ")}`, 400);
  }

  if (reportType !== "TEAM_OVERVIEW" && !userId) {
    return jsonErr("userId is required for individual reports", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const orgId = member!.organization_id;

  try {
    const teamMetrics = await gatherTeamMetrics(orgId, start, end);

    let systemPrompt: string;
    let userPrompt: string;
    let targetUserId: string;

    if (reportType === "TEAM_OVERVIEW") {
      // Gather metrics for all active members
      const members = await db.member.findMany({
        where: { organization_id: orgId, is_active: true },
      });

      const allMetrics = [];
      for (const m of members) {
        const metrics = await gatherEmployeeMetrics(m.user_id, orgId, start, end);
        if (metrics) allMetrics.push(metrics);
      }

      const prompts = await buildTeamPrompt(allMetrics, teamMetrics, startDate, endDate);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
      targetUserId = session!.user.id; // team report attributed to requester
    } else {
      const metrics = await gatherEmployeeMetrics(userId!, orgId, start, end);
      if (!metrics) {
        return jsonErr("Employee not found or no data available", 404);
      }

      const prompts = await buildPrompt(reportType, metrics, teamMetrics, startDate, endDate);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
      targetUserId = userId!;
    }

    // Create report record in GENERATING status
    const reportNo = await generateReportNumber(orgId);
    const report = await db.coachReport.create({
      data: {
        organization_id: orgId,
        user_id: targetUserId,
        generated_by: session!.user.id,
        report_type: reportType as "ALL_ANALYSIS" | "WORK_PATTERN" | "PRODUCTIVITY" | "WELLNESS_BURNOUT" | "TEAM_OVERVIEW",
        report_no: reportNo,
        start_date: start,
        end_date: end,
        metrics_json: {},
        report_content: "",
        status: "GENERATING",
      },
    });

    // Stream from GLM-4.7
    const stream = await streamChatCompletion(systemPrompt, userPrompt);

    let fullContent = "";
    const reportId = report.id;

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send report ID as first event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "meta", reportId })}\n\n`)
          );

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "content", content })}\n\n`)
              );
            }
          }

          // Save completed report
          await db.coachReport.update({
            where: { id: reportId },
            data: {
              report_content: fullContent,
              status: "READY",
            },
          });

          // Send completion event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", reportId })}\n\n`)
          );

          await auditLog({
            userId: session!.user.id,
            organizationId: orgId,
            action: "CREATE",
            entityType: "coach_report",
            entityId: reportId,
            newData: { reportType, targetUserId, startDate, endDate },
          });
        } catch (err) {
          console.error("[AI Coach Stream Error]", err);

          // Mark report as failed
          await db.coachReport.update({
            where: { id: reportId },
            data: { status: "FAILED", report_content: fullContent || "Generation failed" },
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "AI generation failed" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AI Coach POST]", err);
    return jsonErr("Failed to generate report", 500);
  }
}
