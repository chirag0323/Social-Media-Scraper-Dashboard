import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { seedPosts } from "./seed.js";
import { clusterPosts, processPosts } from "./nlp.js";
import { enrichPosts, nlpStatus } from "./ai-nlp.js";
import { fetchLivePosts, platformStatus } from "./providers.js";
import { languages, translate } from "./translation.js";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const translations = new Map();
let rawPosts = seedPosts();
let refreshedAt = new Date().toISOString();
let providerErrors = [];
let processedClusters = processPosts(rawPosts);
let enrichmentRun = { mode: "rules", label: "Rules fallback" };

const contentTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function json(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function body(request) {
  let value = "";
  for await (const chunk of request) value += chunk;
  return value ? JSON.parse(value) : {};
}

function allPosts() {
  return processedClusters.flatMap((cluster) => cluster.posts);
}

function filteredPosts(params) {
  const search = (params.get("q") || "").toLowerCase();
  const match = (post, key, candidate) => !params.get(key) || candidate.toLowerCase() === params.get(key).toLowerCase();
  return allPosts()
    .filter((post) => match(post, "platform", post.platform))
    .filter((post) => match(post, "country", post.country))
    .filter((post) => match(post, "language", post.language))
    .filter((post) => match(post, "category", post.category))
    .filter((post) => match(post, "sentiment", post.sentiment))
    .filter((post) => !params.get("handle") || post.handle.toLowerCase().includes(params.get("handle").toLowerCase()))
    .filter((post) => !params.get("minEngagement") || post.engagement >= Number(params.get("minEngagement")))
    .filter((post) => {
      if (!search) return true;
      const cached = [...translations.entries()]
        .filter(([key]) => key.startsWith(`${post.id}:`))
        .map(([, value]) => value.text).join(" ");
      return `${post.text} ${post.summary} ${cached}`.toLowerCase().includes(search);
    });
}

function sortedClusters(posts, sort) {
  const clusters = clusterPosts(posts);
  if (sort === "engagement") return clusters.sort((a, b) => b.engagement - a.engagement);
  if (sort === "oldest") return clusters.sort((a, b) => Date.parse(a.lead.publishedAt) - Date.parse(b.lead.publishedAt));
  return clusters;
}

function publicClusters(clusters) {
  return clusters.map((cluster) => ({
    ...cluster,
    posts: cluster.posts.map(({ embedding, ...post }) => post),
    lead: (({ embedding, ...post }) => post)(cluster.lead)
  }));
}

function csv(posts) {
  const fields = ["platform", "handle", "country", "language", "publishedAt", "engagement", "category", "sentiment", "summary", "text"];
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [fields.join(","), ...posts.map((post) => fields.map((field) => quote(post[field])).join(","))].join("\n");
}

async function api(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return json(response, 200, { status: "ok", refreshedAt, postCount: allPosts().length, nlp: nlpStatus(enrichmentRun) });
  }
  if (request.method === "GET" && url.pathname === "/api/meta") {
    const posts = allPosts();
    const values = (key) => [...new Set(posts.map((post) => post[key]))].sort();
    return json(response, 200, {
      refreshedAt, providerErrors, sources: platformStatus(), languages, nlp: nlpStatus(enrichmentRun),
      filters: { platforms: values("platform"), countries: values("country"), postLanguages: values("language"), categories: values("category"), sentiments: values("sentiment") }
    });
  }
  if (request.method === "GET" && url.pathname === "/api/posts") {
    const posts = filteredPosts(url.searchParams);
    return json(response, 200, { total: posts.length, clusters: publicClusters(sortedClusters(posts, url.searchParams.get("sort"))) });
  }
  if (request.method === "POST" && url.pathname === "/api/refresh") {
    const live = await fetchLivePosts();
    rawPosts = [...seedPosts(), ...live.posts];
    providerErrors = live.errors;
    const enrichment = await enrichPosts(rawPosts);
    processedClusters = enrichment.clusters;
    enrichmentRun = enrichment.run;
    refreshedAt = new Date().toISOString();
    return json(response, 200, {
      addedLivePosts: live.posts.length, errors: live.errors, refreshedAt, nlp: nlpStatus(enrichmentRun)
    });
  }
  if (request.method === "POST" && url.pathname === "/api/translate") {
    const input = await body(request);
    const post = allPosts().find((item) => item.id === input.postId);
    if (!post) return json(response, 404, { error: "Post not found" });
    try {
      const result = await translate(post.text, input.language);
      translations.set(`${post.id}:${input.language}`, result);
      return json(response, 200, { postId: post.id, language: input.language, ...result });
    } catch (error) {
      return json(response, 400, { error: error.message });
    }
  }
  if (request.method === "GET" && url.pathname === "/api/export.csv") {
    response.writeHead(200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="passport-posts.csv"'
    });
    return response.end(csv(filteredPosts(url.searchParams)));
  }
  return false;
}

async function staticFile(response, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filepath = normalize(join(root, requested));
  if (!filepath.startsWith(root)) return false;
  try {
    if (!(await stat(filepath)).isFile()) return false;
    const file = await readFile(filepath);
    response.writeHead(200, { "content-type": contentTypes[extname(filepath)] || "application/octet-stream" });
    response.end(file);
    return true;
  } catch {
    return false;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/") && await api(request, response, url) !== false) return;
    if (await staticFile(response, url.pathname)) return;
    json(response, 404, { error: "Not found" });
  } catch (error) {
    json(response, 500, { error: "Server error", detail: error.message });
  }
}).listen(port, host, () => {
  console.log(`Passport Pulse listening at http://${host}:${port}`);
});
