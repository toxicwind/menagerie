#!/usr/bin/env bun
// rank-repos v3 — rank-fusion repo ranking for a code-search query.
// Each signal becomes a percentile rank (0..1) within the result set, then
// weighted. Rank fusion resists scale skew: no sqrt/log arbitrary mappings.
//   recency  rank of exp(-age_days / halfLife)   (pushedAt decay)
//   matches  rank of log2(matches+1)             (substance > flukes)
//   stars    rank of log10(stars+1)              (log years of signal)
// Single-match repos get a 0.8 fusion penalty (fluke gate).
// Usage:
//   bun rank-repos.mjs "<query>" [--limit 100] [--half-life 180]
//        [--w-rec=0.35] [--w-mat=0.40] [--w-star=0.25] [--order score|pushed|stars]
const q = process.argv[2];
if (!q) { console.error("usage: bun rank-repos.mjs <query>"); process.exit(1); }
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const limit = arg("limit", 100), halfLife = arg("half-life", 180);
const w = { rec: arg("w-rec", 0.35), mat: arg("w-mat", 0.40), star: arg("w-star", 0.25) };
const orderBy = process.argv.find(a => a.startsWith("--order="))?.slice(8) || "score";
const FLUKE_GATE = 0.8;

const GH = process.env.GH_BIN || "C:/Program Files/GitHub CLI/gh.exe";
const tok = (await Bun.$`${GH} auth token`.text()).trim();
const api = (path) => fetch("https://api.github.com" + path, { headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" } });

const res = await api(`/search/code?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 100)}`);
if (!res.ok) throw new Error(`code search ${res.status}`);
const items = (await res.json()).items;
const byRepo = new Map();
for (const it of items) byRepo.set(it.repository.full_name, (byRepo.get(it.repository.full_name) || 0) + 1);
console.error(`[rank-repos] ${items.length} matches / ${byRepo.size} repos`);

const rows = [];
await Promise.all([...byRepo.entries()].map(async ([repo, matches]) => {
  try {
    const r = await api(`/repos/${repo}`);
    if (!r.ok) return;
    const j = await r.json();
    rows.push({ repo, matches, stars: j.stargazers_count ?? 0, pushed: j.pushed_at ?? "", branch: j.default_branch ?? "main" });
  } catch { /* skip ghosts */ }
}));

// focus pass: for the strongest candidates, measure density (matches/files)
// and code-context (matched paths that are real code vs fixtures/artifacts)
rows.sort((a, b) => b.matches - a.matches || b.stars - a.stars);
const FOCUS_LIMIT = 12;
const top = rows.slice(0, FOCUS_LIMIT);
const CODE = /\.(ts|js|mjs|go|py|rs|java|sh|md|json|html|vue|svelte|tsx|jsx|white)$/i; // .white = WAF benchmark corpora count as code
const ARTIFACT = /(Zone\.Identifier|Snippet|saved|template_error|_files\/|\.css$|\.png$|\.jpg$|(^|\/)Downloads\/|\.baixados$|\.下载$)/i;
const matchPaths = new Map();
for (const it of items) {
  const r = it.repository.full_name;
  if (!matchPaths.has(r)) matchPaths.set(r, []);
  matchPaths.get(r).push(it.path);
}
await Promise.all(top.map(async (r) => {
  try {
    const t = await api(`/repos/${r.repo}/git/trees/${r.branch}?recursive=1`);
    if (!t.ok) return;
    const j = await t.json();
    const files = (j.tree || []).filter(e => e.type === "blob").map(e => e.path);
    if (files.length === 0 || files.length > 200000) return;
    r.fileCount = files.length;
    r.density = r.matches / files.length;
    const mp = matchPaths.get(r.repo) || [];
    const codeHits = mp.filter(p => CODE.test(p) && !ARTIFACT.test(p)).length;
    const artHits = mp.filter(p => ARTIFACT.test(p)).length;
    r.codeRatio = mp.length ? codeHits / mp.length : 0;
    r.junkOnly = mp.length > 0 && artHits === mp.length;
  } catch { /* skip */ }
}));
for (const r of rows) {
  r.density ??= 0; r.codeRatio ??= 0; r.junkOnly ??= false;
}

// signal vectors
const now = Date.now();
const sig = rows.map(r => ({
  ...r,
  ageDays: r.pushed ? Math.max(0, (now - Date.parse(r.pushed)) / 864e5) : 1e9,
  recRaw: 0, matRaw: 0, starRaw: 0, densRaw: 0, codeRaw: 0,
}));
for (const r of sig) {
  r.recRaw = Math.exp(-r.ageDays / halfLife);
  r.matRaw = Math.log2(r.matches + 1);
  r.starRaw = Math.log10(r.stars + 1);
  r.densRaw = Math.log10(1 + r.density * 100000);
  r.codeRaw = r.codeRatio;
}
// canonicality: repo whose matched path-set is contained in a much bigger
// repo's is a derivative — halve its match substance
const paths = new Map();
for (const it of items) {
  const r = it.repository.full_name;
  if (!paths.has(r)) paths.set(r, new Set());
  paths.get(r).add(it.path);
}
for (const r of sig) {
  for (const c of sig) {
    if (c === r || c.stars <= 10 || r.stars * 10 >= c.stars) continue;
    const mine = paths.get(r.repo), theirs = paths.get(c.repo);
    const mineB = new Set([...mine].map(p => p.split("/").pop()));
    const theirsB = new Set([...theirs].map(p => p.split("/").pop()));
    const overlap = [...mineB].filter(b => theirsB.has(b)).length / Math.max(1, mineB.size);
    if (overlap >= 0.7) {
      r.derivativeOf = c.repo;
      r.matRaw *= 0.5;
      break;
    }
  }
}
// percentile rank: (n - 1 - index) / (n - 1)
const rankPct = (arr, key) => {
  const sorted = [...arr].sort((a, b) => b[key] - a[key]);
  const pos = new Map(sorted.map((r, i) => [r.repo, i]));
  for (const r of arr) r[key + "Rank"] = (arr.length - 1 - pos.get(r.repo)) / Math.max(1, arr.length - 1);
};
rankPct(sig, "recRaw"); rankPct(sig, "matRaw"); rankPct(sig, "starRaw"); rankPct(sig, "densRaw"); rankPct(sig, "codeRaw");
const wF = { rec: 0.20, mat: 0.15, star: 0.15, dens: 0.25, code: 0.25 };
for (const r of sig) {
  const gate = r.matches === 1 ? FLUKE_GATE : 1;
  r.score = +(gate * (wF.rec * r.recRawRank + wF.mat * r.matRawRank + wF.star * r.starRawRank + wF.dens * r.densRawRank + wF.code * r.codeRawRank)).toFixed(3);
  r.ageDays = Math.round(r.ageDays);
}

sig.sort((a, b) => orderBy === "score" ? b.score - a.score : orderBy === "pushed" ? (b.pushed || "").localeCompare(a.pushed || "") : b.stars - a.stars);
console.log("repo\tmatches\t★\tpushed\tfiles\tdens\trCode\tjunk\tscore");
for (const r of sig) {
  console.log(`${r.repo}\t${r.matches}\t${r.stars}\t${r.pushed?.slice(0, 10) || "-"}\t${r.fileCount ?? "-"}\t${r.density ? r.density.toExponential(1) : "-"}\t${r.codeRatio.toFixed(2)}\t${r.junkOnly ? "JUNK" : ""}\t${r.score}`);
}
console.error(`[rank-repos] winner: ${sig[0].repo} (${sig[0].score})`);