import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, deleteAssetSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(deleteAssetSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { assetId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("user_id, storage_path")
    .eq("id", assetId)
    .single();
  if (!asset || asset.user_id !== user!.id) {
    return NextResponse.json({ message: "Asset not found." }, { status: 404 });
  }

  await supabase.storage.from("assets").remove([asset.storage_path]);
  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) return NextResponse.json({ message: "Couldn't delete that asset." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
