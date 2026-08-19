import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q");

  const supabase = createServiceRoleClient();
  let query = supabase
    .from("users")
    .select("id, name, email, role, created_at, subscriptions(plan, credits_remaining)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (search) query = query.ilike("email", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ users: data });
}
