import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, type, message, status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data ?? [] });
}
