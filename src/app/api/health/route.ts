import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("templates").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
