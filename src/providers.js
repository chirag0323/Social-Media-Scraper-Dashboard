function normalizeReddit(item) {
  const post = item.data;
  return {
    id: `reddit-live-${post.id}`,
    platform: "Reddit",
    handle: `u/${post.author}`,
    creator: post.author,
    country: "Unknown",
    language: "English",
    engagement: (post.score || 0) + (post.num_comments || 0),
    publishedAt: new Date(post.created_utc * 1000).toISOString(),
    text: `${post.title}. ${post.selftext || ""}`.trim()
  };
}

async function redditPosts() {
  const response = await fetch("https://www.reddit.com/search.json?q=passport&sort=new&t=day&limit=50", {
    headers: { "User-Agent": "PassportPulseDashboard/1.0" }
  });
  if (!response.ok) throw new Error(`Reddit returned ${response.status}`);
  const json = await response.json();
  return json.data.children.map(normalizeReddit);
}

async function youtubePosts(apiKey) {
  const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet", q: "passport", type: "video", maxResults: "25",
    order: "date", publishedAfter: since, key: apiKey
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`YouTube returned ${response.status}`);
  const json = await response.json();
  return json.items.map((item) => ({
    id: `youtube-live-${item.id.videoId}`,
    platform: "YouTube",
    handle: item.snippet.channelTitle,
    creator: item.snippet.channelTitle,
    country: "Unknown",
    language: "Unknown",
    engagement: 0,
    publishedAt: item.snippet.publishedAt,
    text: `${item.snippet.title}. ${item.snippet.description}`.trim()
  }));
}

export const platformStatus = () => [
  { platform: "Reddit", mode: process.env.ENABLE_REDDIT === "true" ? "live" : "demo", requirement: "Set ENABLE_REDDIT=true" },
  { platform: "YouTube", mode: process.env.YOUTUBE_API_KEY ? "live" : "demo", requirement: "YouTube Data API key" },
  { platform: "X", mode: "demo", requirement: "X API approved access" },
  { platform: "Facebook", mode: "demo", requirement: "Meta Graph API access/token" },
  { platform: "Instagram", mode: "demo", requirement: "Instagram Graph API access/token" },
  { platform: "LinkedIn", mode: "demo", requirement: "LinkedIn approved API product" },
  { platform: "TikTok", mode: "demo", requirement: "TikTok Research/Display API approval" }
];

export async function fetchLivePosts() {
  const jobs = [];
  if (process.env.ENABLE_REDDIT === "true") jobs.push(redditPosts());
  if (process.env.YOUTUBE_API_KEY) jobs.push(youtubePosts(process.env.YOUTUBE_API_KEY));
  if (process.env.SOCIAL_INGEST_WEBHOOK) {
    jobs.push(fetch(process.env.SOCIAL_INGEST_WEBHOOK, { method: "POST" }).then((res) => res.json()));
  }
  const settled = await Promise.allSettled(jobs);
  return {
    posts: settled.filter((job) => job.status === "fulfilled").flatMap((job) => job.value),
    errors: settled.filter((job) => job.status === "rejected").map((job) => job.reason.message)
  };
}
