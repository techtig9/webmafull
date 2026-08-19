import { NextResponse } from "next/server";
import { exchangeCodeForToken, verifyOAuthState } from "@/lib/deploy-oauth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { encryptDeployToken } from "@/lib/deploy-secrets";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const settingsUrl = new URL("/dashboard/settings", origin);

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "vercel_oauth_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = verifyOAuthState("vercel", state);
  if (!userId) {
    settingsUrl.searchParams.set("error", "vercel_oauth_expired");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeCodeForToken("vercel", code);
    const supabase = createServiceRoleClient();

    const accessTokenCiphertext = encryptDeployToken(token.accessToken);
    const refreshTokenCiphertext = token.refreshToken ? encryptDeployToken(token.refreshToken) : null;

    await supabase.from("deploy_connections").upsert(
      {
        user_id: userId,
        provider: "vercel",
        access_token_ciphertext: accessTokenCiphertext,
        refresh_token_ciphertext: refreshTokenCiphertext,
        expires_at: token.expiresAt,
      },
      { onConflict: "user_id,provider" }
    );
    settingsUrl.searchParams.set("connected", "vercel");
  } catch (err) {
    console.error("vercel oauth callback error", err);
    settingsUrl.searchParams.set("error", "vercel_oauth_failed");
  }

  return NextResponse.redirect(settingsUrl);
}
