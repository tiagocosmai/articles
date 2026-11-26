const API = "https://api.github.com";
const REPOSITORY = "tiagocosmai/portifolio";
const API_VERSION = "2022-11-28";

type JsonObject = Record<string, unknown>;

export class SitemapPublishError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SitemapPublishError";
  }
}

export class SitemapSnapshotChangedError extends Error {
  constructor() {
    super("The public article catalog changed during sitemap publishing");
    this.name = "SitemapSnapshotChangedError";
  }
}

async function request<T extends JsonObject>(
  token: string,
  path: string,
  init: RequestInit = {},
  allowMissing = false,
): Promise<T | null> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("X-GitHub-Api-Version", API_VERSION);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new SitemapPublishError("GitHub rejected the sitemap update", response.status);
  return (await response.json()) as T;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function readFile(token: string, path: string, branch: string): Promise<string | null> {
  const params = new URLSearchParams({ ref: branch });
  const file = await request<JsonObject>(
    token,
    `/repos/${REPOSITORY}/contents/${encodePath(path)}?${params.toString()}`,
    {},
    true,
  );
  if (!file) return null;
  if (file.encoding !== "base64" || typeof file.content !== "string") {
    throw new SitemapPublishError("GitHub returned an unreadable file", 502);
  }
  return Buffer.from(file.content, "base64").toString("utf8");
}

export async function publishSitemapFiles(
  token: string,
  files: Record<string, string>,
  isCurrent?: () => Promise<boolean>,
): Promise<{ updated: boolean; branch: string }> {
  const repository = await request<JsonObject>(token, `/repos/${REPOSITORY}`);
  const branch = repository?.default_branch;
  if (typeof branch !== "string" || !branch) {
    throw new SitemapPublishError("The Portifolio default branch is unavailable", 502);
  }

  const current = await Promise.all(
    Object.entries(files).map(async ([path, value]) => [path, await readFile(token, path, branch), value] as const),
  );
  const changed = current.filter(([, previous, next]) => previous !== next);
  if (changed.length === 0) return { updated: false, branch };

  const refPath = `/repos/${REPOSITORY}/git/ref/heads/${encodeURIComponent(branch)}`;
  const ref = await request<JsonObject>(token, refPath);
  const head = ref?.object as JsonObject | undefined;
  const parentSha = head?.sha;
  if (typeof parentSha !== "string") throw new SitemapPublishError("The Portifolio branch head is unavailable", 502);

  const parent = await request<JsonObject>(token, `/repos/${REPOSITORY}/git/commits/${parentSha}`);
  const baseTree = parent?.tree as JsonObject | undefined;
  if (typeof baseTree?.sha !== "string") throw new SitemapPublishError("The Portifolio tree is unavailable", 502);

  const blobs = await Promise.all(
    changed.map(async ([path, , content]) => {
      const blob = await request<JsonObject>(token, `/repos/${REPOSITORY}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content, encoding: "utf-8" }),
      });
      if (typeof blob?.sha !== "string") {
        throw new SitemapPublishError("GitHub did not create a content blob", 502);
      }
      return { path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  const tree = await request<JsonObject>(token, `/repos/${REPOSITORY}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree.sha, tree: blobs }),
  });
  if (typeof tree?.sha !== "string") throw new SitemapPublishError("GitHub did not create a file tree", 502);

  const commit = await request<JsonObject>(token, `/repos/${REPOSITORY}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: "chore: refresh search sitemap",
      tree: tree.sha,
      parents: [parentSha],
    }),
  });
  if (typeof commit?.sha !== "string") throw new SitemapPublishError("GitHub did not create a sitemap commit", 502);

  if (isCurrent && !(await isCurrent())) throw new SitemapSnapshotChangedError();

  try {
    await request<JsonObject>(token, `/repos/${REPOSITORY}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } catch (error) {
    if (error instanceof SitemapPublishError && [409, 422].includes(error.status)) {
      throw new SitemapPublishError("The Portifolio branch changed during sitemap publishing", 409);
    }
    throw error;
  }
  return { updated: true, branch };
}
