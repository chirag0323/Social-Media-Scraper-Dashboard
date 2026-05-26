import test from "node:test";
import assert from "node:assert/strict";
import { clusterPosts, detectGibberish, processPosts } from "../src/nlp.js";
import { enrichPosts } from "../src/ai-nlp.js";
import { seedPosts } from "../src/seed.js";
import { translate } from "../src/translation.js";

test("spam or gibberish promotion is rejected", () => {
  const spam = seedPosts().find((post) => post.id === "x-spam");
  assert.equal(detectGibberish(spam), true);
  assert.equal(processPosts(seedPosts()).some((cluster) => cluster.posts.some((post) => post.id === "x-spam")), false);
});

test("posts are categorised and related appointments are clustered", () => {
  const clusters = processPosts(seedPosts());
  const appointmentCluster = clusters.find((cluster) => cluster.posts.some((post) => post.id === "x-001"));
  assert.equal(appointmentCluster.category, "Appointments");
  assert.equal(appointmentCluster.postCount, 2);
});

test("only content inside the 24 hour window is retained", () => {
  const old = { ...seedPosts()[0], id: "old", publishedAt: new Date(Date.now() - (25 * 60 * 60_000)).toISOString() };
  assert.equal(processPosts([old]).length, 0);
});

test("all required translation languages are accepted in local mode", async () => {
  for (const language of ["en", "hi", "pa", "es", "fr", "de", "ar", "zh", "ru", "ja"]) {
    const result = await translate("Passport renewal appointment", language);
    assert.ok(result.text.length > 0);
  }
});

test("semantic embeddings cluster multilingual posts with different vocabulary", () => {
  const posts = [
    { ...seedPosts()[0], category: "Renewal", meaningful: true, embedding: [1, 0], text: "Passport renewed before travel." },
    { ...seedPosts()[1], category: "Renewal", meaningful: true, embedding: [0.99, 0.01], text: "El documento fue renovado para el viaje." }
  ];
  assert.equal(clusterPosts(posts)[0].postCount, 2);
});

test("configured AI analysis provides summaries, filtering and semantic vectors", async () => {
  const candidates = [seedPosts()[0], seedPosts().find((post) => post.id === "x-spam")];
  const fetchImpl = async (url) => {
    if (url.endsWith("/responses")) {
      return {
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            analyses: [
              {
                id: "x-001", meaningful: true, category: "Appointments", sentiment: "Positive",
                summary: "Traveller reports securing a Delhi renewal appointment after repeated checks and recommends monitoring official appointment availability.",
                detectedLanguage: "English", moderationReason: ""
              },
              {
                id: "x-spam", meaningful: false, category: "Scams/Fraud", sentiment: "Negative",
                summary: "Promotional spam removed from results.", detectedLanguage: "English",
                moderationReason: "Spam and suspicious link promotion"
              }
            ]
          })
        })
      };
    }
    return { ok: true, json: async () => ({ data: [{ index: 0, embedding: [0.8, 0.2] }] }) };
  };
  const result = await enrichPosts(candidates, {
    config: { apiKey: "test-key", baseUrl: "https://api.test/v1", analysisModel: "test-model", embeddingModel: "test-embedding" },
    fetchImpl
  });
  assert.equal(result.run.mode, "ai");
  assert.equal(result.clusters.length, 1);
  assert.match(result.clusters[0].lead.summary, /Delhi renewal appointment/);
  assert.equal(result.clusters[0].lead.nlpMethod, "OpenAI test-model");
});
