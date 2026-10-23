/**
 * menagerie personas — openfang-layout loader (agents/<name>/agent.toml).
 * Parses TOML-lite: [identity], [model], system_prompt triple-quoted block.
 * Exposes personaSystem(name, tone) + agent manifests for the HUD/hands.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const agentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'agents');

/** Parse a single agent.toml (TOML-lite). */
export function parseAgentToml(text) {
  const out = { identity: {}, model: {} };
  let section = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const sec = line.match(/^\[([a-z_]+)\]\s*$/);
    if (sec) { section = sec[1]; continue; }
    if (line.startsWith('system_prompt')) {
      const open = line.indexOf('"""');
      const rest = line.slice(open + 3);
      if (rest.includes('"""')) {
        out.model.system_prompt = rest.slice(0, rest.indexOf('"""')).trim();
      } else {
        const parts = [];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (l.includes('"""')) {
            const cut = l.indexOf('"""');
            if (cut > 0) parts.push(l.slice(0, cut));
            break;
          }
          parts.push(l);
          i++;
        }
        out.model.system_prompt = parts.join('\n').trim();
      }
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (m) {
      const v = m[2].trim().replace(/^"|"$/g, '');
      if (section) {
        out[section][m[1]] = v;
      } else if (m[1] === 'name') {
        out.name = v;
      }
    }
  }
  return {
    name: out.name || (out.identity?.name) || section,
    identity: out.identity,
    model: out.model,
  };
}

/** Load all personas as a map name -> { identity, model } */
export function loadPersonas(dir = agentsDir) {
  const map = {};
  if (!existsSync(dir)) return map;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(dir, entry.name, 'agent.toml');
    if (!existsSync(file)) continue;
    try {
      const p = parseAgentToml(readFileSync(file, 'utf8'));
      if (p.model?.system_prompt) map[entry.name] = p;
    } catch { /* skip broken */ }
  }
  return map;
}

export const personas = loadPersonas();
export const personaNames = Object.keys(personas);

/** system prompt with {tone} substituted; unknown -> ghost. */
export function personaSystem(name, tone = 'wry') {
  const p = personas[name] || personas.ghost;
  const sys = p?.model?.system_prompt || '';
  return sys.replace('{tone}', tone || p?.model?.tone || 'wry');
}