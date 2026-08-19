import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, type, message, status, created_at, users(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ feedback: data ?? [] });
}
