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
    settingsUrl.searchParams.set("error", "github_oauth_failed");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = verifyOAuthState("github", state);
  if (!userId) {
    settingsUrl.searchParams.set("error", "github_oauth_expired");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const token = await exchangeCodeForToken("github", code);
    const supabase = createServiceRoleClient();

    const accessTokenCiphertext = encryptDeployToken(token.accessToken);

    await supabase.from("deploy_connections").upsert(
      {
        user_id: userId,
        provider: "github",
        access_token_ciphertext: accessTokenCiphertext,
        // Classic GitHub OAuth apps issue non-expiring tokens by default —
        // no refresh_token, no expires_in in the response, unlike Vercel.
        refresh_token_ciphertext: null,
        expires_at: token.expiresAt ?? null,
      },
      { onConflict: "user_id,provider" }
    );
    settingsUrl.searchParams.set("connected", "github");
  } catch (err) {
    console.error("github oauth callback error", err);
    settingsUrl.searchParams.set("error", "github_oauth_failed");
  }

  return NextResponse.redirect(settingsUrl);
}
