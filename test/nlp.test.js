import test from "node:test";
import assert from "node:assert/strict";
import { detectGibberish, processPosts } from "../src/nlp.js";
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
