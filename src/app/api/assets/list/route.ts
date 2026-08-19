import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();

  const { data: assets, error } = await supabase
    .from("assets")
    .select("id, storage_path, file_name, mime_type, size_bytes, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const withUrls = (assets ?? []).map((asset) => ({
    ...asset,
    url: supabase.storage.from("assets").getPublicUrl(asset.storage_path).data.publicUrl,
  }));

  return NextResponse.json({ assets: withUrls });
}
