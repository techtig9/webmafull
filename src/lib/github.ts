/** Sanitizes a project name into a valid GitHub repo name: lowercase,
 * alphanumeric/hyphen/underscore/period only, no leading/trailing dots or
 * hyphens, capped at GitHub's 100-char limit, and never empty (a name that's
 * entirely stripped away falls back to "webma-project" rather than sending
 * an empty string to the API). Pure and exported specifically so the
 * sanitization rules — the part most likely to have an edge case someone
 * hits with a real project name — are unit tested without any network call. */
export function sanitizeRepoName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);
  return cleaned.length > 0 ? cleaned : "webma-project";
}

export interface GithubRepo {
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
}

const API = "https://api.github.com";

function headers(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Creates the repo if it doesn't exist yet, or returns the existing one.
 * Deliberately checks-then-creates rather than trying to create and
 * swallowing a 422-already-exists, since GitHub also returns 422 for other
 * validation failures (an invalid name, an org that disallows repo
 * creation) — treating every 422 as "already exists" would hide those. */
export async function ensureRepo(accessToken: string, repoName: string): Promise<GithubRepo> {
  const meRes = await fetch(`${API}/user`, { headers: headers(accessToken) });
  if (!meRes.ok) throw new Error("Couldn't verify the connected GitHub account.");
  const me = await meRes.json();

  const existingRes = await fetch(`${API}/repos/${me.login}/${repoName}`, { headers: headers(accessToken) });
  if (existingRes.ok) {
    const repo = await existingRes.json();
    return { fullName: repo.full_name, htmlUrl: repo.html_url, defaultBranch: repo.default_branch };
  }

  const createRes = await fetch(`${API}/user/repos`, {
    method: "POST",
    headers: { ...headers(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ name: repoName, private: true, auto_init: true }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => null);
    throw new Error(err?.message ?? "Couldn't create the GitHub repository.");
  }
  const repo = await createRes.json();
  return { fullName: repo.full_name, htmlUrl: repo.html_url, defaultBranch: repo.default_branch };
}

/** Pushes every file in `files` as ONE atomic commit via the Git Data API
 * (blob-per-file -> one tree -> one commit -> ref update), not N sequential
 * PUT /contents calls. That distinction matters beyond tidiness: N separate
 * calls means N separate commits and a real chance of a half-pushed state
 * if one call fails partway through; this either lands as one commit or
 * throws before touching the ref at all. */
export async function pushFilesAsCommit(
  accessToken: string,
  repo: GithubRepo,
  files: Record<string, string>,
  message: string
): Promise<{ commitUrl: string }> {
  const h = { ...headers(accessToken), "Content-Type": "application/json" };
  const [owner, repoName] = repo.fullName.split("/");

  const refRes = await fetch(`${API}/repos/${owner}/${repoName}/git/ref/heads/${repo.defaultBranch}`, { headers: h });
  if (!refRes.ok) throw new Error("Couldn't read the repository's current branch state.");
  const ref = await refRes.json();
  const baseCommitSha = ref.object.sha;

  const baseCommitRes = await fetch(`${API}/repos/${owner}/${repoName}/git/commits/${baseCommitSha}`, { headers: h });
  if (!baseCommitRes.ok) throw new Error("Couldn't read the repository's base commit.");
  const baseCommit = await baseCommitRes.json();
  const baseTreeSha = baseCommit.tree.sha;

  const blobs = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const res = await fetch(`${API}/repos/${owner}/${repoName}/git/blobs`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ content, encoding: "utf-8" }),
      });
      if (!res.ok) throw new Error(`Couldn't upload ${path} to GitHub.`);
      const blob = await res.json();
      return { path, sha: blob.sha };
    })
  );

  const treeRes = await fetch(`${API}/repos/${owner}/${repoName}/git/trees`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
    }),
  });
  if (!treeRes.ok) throw new Error("Couldn't build the commit tree on GitHub.");
  const tree = await treeRes.json();

  const commitRes = await fetch(`${API}/repos/${owner}/${repoName}/git/commits`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommitSha] }),
  });
  if (!commitRes.ok) throw new Error("Couldn't create the commit on GitHub.");
  const commit = await commitRes.json();

  const updateRefRes = await fetch(`${API}/repos/${owner}/${repoName}/git/refs/heads/${repo.defaultBranch}`, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify({ sha: commit.sha }),
  });
  if (!updateRefRes.ok) throw new Error("Created the commit, but couldn't move the branch to point at it.");

  return { commitUrl: commit.html_url };
}
