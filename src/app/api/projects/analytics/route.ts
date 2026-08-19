import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { summarizeAnalytics, type PageViewRow } from "@/lib/analytics";

const ALLOWED_RANGES = [7, 30, 90] as const;

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ message: "projectId is required." }, { status: 400 });
  }
  const requestedDays = Number(searchParams.get("days") ?? "30");
  const days = ALLOWED_RANGES.includes(requestedDays as (typeof ALLOWED_RANGES)[number]) ? requestedDays : 30;

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("page_views")
    .select("path, referrer, visitor_hash, created_at")
    .eq("project_id", projectId)
    .gte("created_at", since.toISOString());

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  // submitter_ip_hash uses the exact same daily-rotating, salted hash as
  // page_views.visitor_hash (see visitor-tracking.ts) — the intersection of
  // the two is real same-day conversion attribution, not an independent
  // count. A separate query rather than a join since the two tables track
  // fundamentally different events and joining them would multiply rows
  // (one page-view row per visit, one submission row per conversion) rather
  // than align them the way summarizeAnalytics actually needs.
  const { data: submissions, error: submissionsError } = await supabase
    .from("form_submissions")
    .select("submitter_ip_hash")
    .eq("project_id", projectId)
    .gte("created_at", since.toISOString());

  if (submissionsError) return NextResponse.json({ message: submissionsError.message }, { status: 500 });

  const convertingHashes = (submissions ?? [])
    .map((s) => s.submitter_ip_hash)
    .filter((h): h is string => h !== null);

  return NextResponse.json({
    days,
    ...summarizeAnalytics((data ?? []) as PageViewRow[], days, new Date(), convertingHashes),
  });
}
