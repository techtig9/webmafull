// Real deployment integration against the Vercel REST API.
//
// Accepts an optional per-user access token (from a connected deploy_connections
// row, via OAuth — see src/lib/deploy-oauth.ts) so a customer's site deploys under
// THEIR OWN account. If they haven't connected one, the call falls back to
// Techtig's platform-level token (VERCEL_API_TOKEN) so deploys still work — just
// under Techtig's account, same as before OAuth existed.
export interface DeployResult {
  deploymentUrl: string;
  status: "queued" | "building" | "ready" | "error";
  providerDeploymentId?: string;
  logs?: string;
}

export async function deployToVercel(
  projectName: string,
  files: Record<string, string>,
  userToken?: string
): Promise<DeployResult> {
  const token = userToken ?? process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error("VERCEL_API_TOKEN is not configured.");

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      files: Object.entries(files).map(([file, data]) => ({ file, data })),
      target: "production",
      projectSettings: { framework: "nextjs" },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return { deploymentUrl: "", status: "error", logs: data.error?.message ?? "Vercel deployment failed." };
  }

  return {
    deploymentUrl: `https://${data.url}`,
    status: data.readyState === "READY" ? "ready" : data.readyState === "ERROR" ? "error" : "building",
    providerDeploymentId: data.id,
    logs: data.readyState === "ERROR" ? "Vercel reported a deployment error." : undefined,
  };
}



// ---------------------------------------------------------------------------
// Custom domain attachment — same platform-token MVP caveat as above applies.
// ---------------------------------------------------------------------------

export interface DomainVerification {
  attached: boolean;
  verified: boolean;
  /** DNS records the customer needs to add at their registrar, when not yet verified. */
  requiredRecords?: Array<{ type: string; name: string; value: string }>;
  error?: string;
}

const slug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

/** Attaches a domain to the Vercel project the site was deployed under, and
 * returns the DNS records the customer needs to configure at their registrar. */
export async function attachVercelDomain(projectName: string, domain: string): Promise<DomainVerification> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { attached: false, verified: false, error: "VERCEL_API_TOKEN is not configured." };

  const res = await fetch(`https://api.vercel.com/v10/projects/${slug(projectName)}/domains`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
  const data = await res.json();

  if (!res.ok) {
    return { attached: false, verified: false, error: data.error?.message ?? "Couldn't attach domain." };
  }

  return {
    attached: true,
    verified: !data.verification || data.verification.length === 0,
    requiredRecords: (data.verification ?? []).map((v: { type: string; domain: string; value: string }) => ({
      type: v.type,
      name: v.domain,
      value: v.value,
    })),
  };
}

/** Re-checks whether a previously-attached domain's DNS has propagated. */
export async function checkVercelDomainStatus(projectName: string, domain: string): Promise<DomainVerification> {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return { attached: false, verified: false, error: "VERCEL_API_TOKEN is not configured." };

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${slug(projectName)}/domains/${domain}/config`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  if (!res.ok) {
    return { attached: false, verified: false, error: data.error?.message ?? "Domain not found." };
  }

  return { attached: true, verified: !data.misconfigured };
}
