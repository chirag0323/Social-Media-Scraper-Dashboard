const categoryRules = [
  ["Scams/Fraud", /fraud|scam|phishing|agent|ਧੋਖ|احتيال/i],
  ["Tatkal", /tatkal|तत्काल/i],
  ["Appointments", /appointment|slot|termin|अपॉइंटमेंट|ਅਪਾਇੰਟਮੈਂਟ|موعد/i],
  ["Renewal", /renew|renewal|renovaci|navi|नवीनीकरण|ਨਵੀਨੀਕਰਨ|تجديد|reisepass ist angekommen/i],
  ["Visa", /visa|visum/i],
  ["Travel Issues", /validity|boarding|expiry|expired|travel|viaje|flight|fly| الرحلة/i],
  ["Government Announcements", /advisory|official portal|department|government|आधिकारिक|सरकारी|الموقع الرسمي/i],
  ["News", /news|update|announc/i],
  ["Application", /application|apply|applicant|antrag|आवेदन/i]
];

const stopWords = new Set("the a an for to in of is are via and or my your after only should this that has with from i finally on".split(" "));
const positive = /finally|found|success|improving|arrived|got|मिल|وصل|angekommen|llegó/i;
const negative = /fraud|scam|phishing|delay|denied|expired|warning|caduc|delayed/i;

export function detectGibberish(post) {
  const text = post.text.trim();
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const unique = new Set(words);
  const repeated = words.length > 5 && unique.size / words.length < 0.45;
  const promotional = /(bit\.ly|tinyurl|click click|win-now|\$\$\$)/i.test(text);
  const symbols = (text.match(/[!$]/g) || []).length > 8;
  return text.length < 20 || repeated || promotional || symbols;
}

export function categorise(text) {
  const found = categoryRules.find(([, matcher]) => matcher.test(text));
  return found ? found[0] : "Personal Experiences";
}

export function sentiment(text) {
  const pos = positive.test(text);
  const neg = negative.test(text);
  if (pos && !neg) return "Positive";
  if (neg && !pos) return "Negative";
  return "Neutral";
}

export function summary(text, category) {
  const cleaned = text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ");
  const core = words.slice(0, 25).join(" ");
  const sentence = `${category}: ${core}${words.length > 25 ? "..." : ""}`;
  return sentence.split(" ").slice(0, 30).join(" ");
}

export function withinLast24Hours(post) {
  const age = Date.now() - Date.parse(post.publishedAt);
  return age >= 0 && age <= 24 * 60 * 60_000;
}

export function ruleBasedEnrichment(post) {
  const category = categorise(post.text);
  return {
    ...post,
    category,
    sentiment: sentiment(post.text),
    summary: summary(post.text, category),
    meaningful: !detectGibberish(post),
    nlpMethod: "Rules fallback"
  };
}

export function tokens(text) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter((token) => token.length > 2 && !stopWords.has(token)));
}

function similarity(a, b) {
  const both = [...a].filter((item) => b.has(item)).length;
  const either = new Set([...a, ...b]).size;
  return either ? both / either : 0;
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] ** 2;
    magnitudeB += b[index] ** 2;
  }
  return magnitudeA && magnitudeB ? dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)) : 0;
}

export function clusterPosts(posts) {
  const accepted = posts
    .filter((post) => post.meaningful !== false)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const clusters = [];
  for (const post of accepted) {
    const postTokens = tokens(post.text);
    const existing = clusters.find((cluster) => {
      if (cluster.category !== post.category) return false;
      if (post.embedding && cluster.leadEmbedding) {
        return cosineSimilarity(post.embedding, cluster.leadEmbedding) >= 0.82;
      }
      return similarity(postTokens, cluster.tokens) >= 0.3;
    });
    if (existing) {
      existing.posts.push(post);
      existing.engagement += post.engagement;
      existing.platforms.add(post.platform);
    } else {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        category: post.category,
        engagement: post.engagement,
        platforms: new Set([post.platform]),
        tokens: postTokens,
        leadEmbedding: post.embedding,
        posts: [post]
      });
    }
  }
  return clusters.map((cluster) => ({
    ...cluster,
    platforms: [...cluster.platforms],
    tokens: undefined,
    leadEmbedding: undefined,
    postCount: cluster.posts.length,
    lead: cluster.posts[0]
  }));
}

export function processPosts(rawPosts) {
  const accepted = rawPosts
    .filter(withinLast24Hours)
    .map(ruleBasedEnrichment)
    .filter((post) => post.meaningful);
  return clusterPosts(accepted);
}
