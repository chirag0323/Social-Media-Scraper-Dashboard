const state = { meta: null, data: null };
const $ = (selector) => document.querySelector(selector);
const filters = ["platform", "country", "language", "category", "sentiment"];
const elements = Object.fromEntries(["q", "handle", "minEngagement", "sort"].map((id) => [id, $(`#${id}`)]));

function params() {
  const search = new URLSearchParams();
  [...filters, "q", "handle", "minEngagement", "sort"].forEach((name) => {
    const element = document.getElementById(name);
    if (element?.value) search.set(name, element.value);
  });
  return search;
}

function relativeTime(value) {
  const mins = Math.floor((Date.now() - Date.parse(value)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function optionSelect(name, values) {
  const plural = { platform: "platforms", country: "countries", language: "languages", category: "categories", sentiment: "sentiments" };
  const label = document.createElement("label");
  label.textContent = name === "language" ? "Original language" : name[0].toUpperCase() + name.slice(1);
  label.innerHTML += `<select id="${name}"><option value="">All ${plural[name]}</option>${values.map((v) => `<option>${v}</option>`).join("")}</select>`;
  return label;
}

function renderMeta(meta) {
  state.meta = meta;
  const mapping = { platform: meta.filters.platforms, country: meta.filters.countries, language: meta.filters.postLanguages, category: meta.filters.categories, sentiment: meta.filters.sentiments };
  const wrapper = $("#filter-fields");
  wrapper.innerHTML = "";
  filters.forEach((filter) => wrapper.append(optionSelect(filter, mapping[filter])));
  wrapper.querySelectorAll("select").forEach((select) => select.addEventListener("change", loadPosts));
  $("#sources").innerHTML = meta.sources.map((source) =>
    `<div class="source" title="${source.requirement}"><span>${source.platform}</span><b class="${source.mode === "live" ? "live-status" : "demo"}">${source.mode}</b></div>`).join("");
  $("#stamp").textContent = `Updated ${new Date(meta.refreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderStats(data) {
  const posts = data.clusters.flatMap((cluster) => cluster.posts);
  const engagements = posts.reduce((sum, post) => sum + post.engagement, 0);
  const negative = posts.filter((post) => post.sentiment === "Negative").length;
  const uniqueCountries = new Set(posts.map((post) => post.country)).size;
  const items = [["Relevant posts", data.total], ["Topic clusters", data.clusters.length], ["Total engagement", engagements.toLocaleString()], ["Regions / alerts", `${uniqueCountries} / ${negative}`]];
  $("#stats").innerHTML = items.map(([label, value]) => `<article class="stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

async function requestTranslation(card, postId) {
  const language = card.querySelector(".language").value;
  const response = await fetch("/api/translate", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ postId, language })
  });
  const translation = await response.json();
  const output = card.querySelector(".translated");
  output.innerHTML = `${translation.text}<small>${translation.method}</small>`;
  output.classList.remove("hidden");
}

function renderCard(cluster) {
  const node = $("#card-template").content.cloneNode(true);
  const card = node.querySelector(".card");
  const post = cluster.lead;
  card.querySelector(".badges").innerHTML = [
    `<span class="badge category">${post.category}</span>`,
    `<span class="badge">${post.platform}</span>`,
    `<span class="badge ${post.sentiment}">${post.sentiment}</span>`
  ].join("");
  card.querySelector(".age").textContent = relativeTime(post.publishedAt);
  card.querySelector(".summary").textContent = post.summary;
  card.querySelector(".text").textContent = post.text;
  card.querySelector(".meta").textContent = `${post.handle}  |  ${post.country}  |  ${post.language}  |  ${post.engagement.toLocaleString()} engagements`;
  card.querySelector(".language").innerHTML = state.meta.languages
    .map((language) => `<option value="${language.code}">${language.name}</option>`).join("");
  card.querySelector(".translate").addEventListener("click", () => requestTranslation(card, post.id));
  const thread = card.querySelector(".thread");
  const duplicateContainer = card.querySelector(".duplicates");
  thread.textContent = cluster.postCount > 1 ? `View ${cluster.postCount - 1} similar` : "Single post";
  thread.disabled = cluster.postCount === 1;
  if (cluster.postCount > 1) {
    duplicateContainer.innerHTML = cluster.posts.slice(1).map((duplicate) =>
      `<div class="duplicate"><b>${duplicate.platform}</b> ${duplicate.handle} (${relativeTime(duplicate.publishedAt)}): ${duplicate.text}</div>`).join("");
    thread.addEventListener("click", () => duplicateContainer.classList.toggle("hidden"));
  }
  return node;
}

function renderPosts(data) {
  state.data = data;
  renderStats(data);
  $("#post-count").textContent = `${data.total} posts in ${data.clusters.length} topics`;
  const container = $("#clusters");
  container.innerHTML = "";
  if (!data.clusters.length) {
    container.innerHTML = '<div class="empty">No meaningful passport conversations match these filters.</div>';
    return;
  }
  data.clusters.forEach((cluster) => container.append(renderCard(cluster)));
}

async function loadPosts() {
  const response = await fetch(`/api/posts?${params()}`);
  renderPosts(await response.json());
}

async function init() {
  const meta = await fetch("/api/meta").then((response) => response.json());
  renderMeta(meta);
  await loadPosts();
}

let searchTimer;
["q", "handle", "minEngagement"].forEach((name) => elements[name].addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPosts, 200);
}));
elements.sort.addEventListener("change", loadPosts);
$("#reset").addEventListener("click", () => {
  document.querySelectorAll(".filters input, .filters select").forEach((control) => { control.value = ""; });
  elements.sort.value = "newest";
  loadPosts();
});
$("#csv").addEventListener("click", () => { window.location = `/api/export.csv?${params()}`; });
$("#pdf").addEventListener("click", () => window.print());
$("#refresh").addEventListener("click", async (event) => {
  event.target.disabled = true;
  event.target.textContent = "Refreshing...";
  await fetch("/api/refresh", { method: "POST" });
  renderMeta(await fetch("/api/meta").then((response) => response.json()));
  await loadPosts();
  event.target.textContent = "Refresh feeds";
  event.target.disabled = false;
});
init();
setInterval(loadPosts, 60_000);
