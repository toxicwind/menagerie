import { readFileSync } from "node:fs";
import { visionChat } from "C:/Users/beebe/vision-kit/src/index.mjs";

const b64 = readFileSync("C:/thisvid-fix/shots/live-headless.png").toString("base64");
const note = `Look at this screenshot of a video page. Be blunt: tell me EXACTLY what looks BAD or ugly, element by element.
1) The video player area — is the video rendering, or black/blue/blank/letterboxed with bars? Any giant empty space around it?
2) Color scheme — jarring? Too dark/light? Clashing? Inconsistent theming?
3) Layout — huge gaps, misaligned cards, overlapping or floating elements?
4) Player controls / any injected bar — overlapping the video, covering content, out of place?
5) Text — cut-off, unreadable, wrong contrast?
Give concrete positions and the single CSS change that would fix the biggest ugliness. Be specific.`;

const r = await visionChat({ b64, note, max_tokens: 500, temperature: 0.3 });
console.log("[vision-fix] " + r);