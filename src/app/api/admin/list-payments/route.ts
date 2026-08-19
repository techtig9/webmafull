import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, paddle_transaction_id, amount, currency, status, created_at, users(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const totalRevenue = (data ?? [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return NextResponse.json({ payments: data, totalRevenue });
}
