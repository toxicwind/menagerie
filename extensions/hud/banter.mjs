// menagerie hud — banter engine (canonical ESM implementation).
// Turn-taking state machine for the three-agent cast. Content scripts cannot
// statically import modules, so extensions/hud/content.js embeds a drift-guarded
// inline copy of this file's body (minus `export` prefixes) — see
// tests/banter.test.mjs for the "inline === module" guard.

export const AGENTS = ['Clippy', 'Bonzi', 'Rowdy'];

export const PERSONA = {
  Clippy: { color: '#4f9dff', glow: 'rgba(79,157,255,0.45)', tail: '#4f9dff' },
  Bonzi: { color: '#b06eff', glow: 'rgba(176,110,255,0.45)', tail: '#b06eff' },
  Rowdy: { color: '#d9a066', glow: 'rgba(217,160,102,0.45)', tail: '#d9a066' },
};

export const NEUTRAL = { color: '#9aa7b8', glow: 'rgba(154,167,184,0.35)', tail: '#9aa7b8' };

export const FALLBACK_LINES = {
  generic_reactions: ['huh?', 'look!', 'ok.', 'whoa.'],
};

export function normalizeName(name) {
  const s = String(name == null ? '' : name).trim();
  if (!s) return 'Clippy';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function stripTags(txt) {
  return String(txt == null ? '' : txt).replace(/<[^>]+>/g, '').trim();
}

export function textFromInput(input) {
  const src = input && (input.event || input.vision || input.text || input.what);
  return stripTags(src).slice(0, 110);
}

export function personaStyle(name) {
  const key = normalizeName(name);
  const p = PERSONA[key] || NEUTRAL;
  return {
    name: key,
    color: p.color,
    glow: p.glow,
    tail: p.tail,
    border: '1px solid ' + p.color,
    css:
      'border:1px solid ' + p.color +
      ';box-shadow:0 0 16px ' + p.glow + ',0 4px 18px rgba(0,0,0,0.5)' +
      ';--mg-tail:' + p.tail + ';',
  };
}

export function createBanter(lines) {
  const src = lines && typeof lines === 'object' ? lines : {};
  const openers = src.openers && typeof src.openers === 'object' ? src.openers : {};
  const reacts = src.reacts && typeof src.reacts === 'object' ? src.reacts : {};
  const generic =
    Array.isArray(src.generic_reactions) && src.generic_reactions.length
      ? src.generic_reactions
      : FALLBACK_LINES.generic_reactions;

  // deterministic round-robin line pickers (no Math.random -> reproducible turns)
  const counters = new Map();
  let cursor = -1;
  const history = [];

  const nextLine = (bank, key) => {
    const list = Array.isArray(bank) && bank.length ? bank : generic;
    const i = (counters.get(key) || 0) % list.length;
    counters.set(key, i + 1);
    return list[i];
  };

  // deterministic rotation: Clippy -> Bonzi -> Rowdy -> Clippy..., never the previous speaker
  const pickSpeaker = (prev) => {
    const start = (cursor + 1) % AGENTS.length;
    for (let k = 0; k < AGENTS.length; k += 1) {
      const idx = (start + k) % AGENTS.length;
      if (AGENTS[idx] !== prev) {
        cursor = idx;
        return AGENTS[idx];
      }
    }
    return AGENTS[start];
  };

  // reactor: the OTHER agent; alternates between the two non-speakers (rotation-wise)
  const pickReactor = (speaker, t) => {
    const cands = AGENTS.filter((a) => a !== speaker);
    return cands[t % cands.length];
  };

  const state = {
    tick: 0,
    lastSpeaker: null,
    lastReactor: null,
    history,
  };

  function tick(input) {
    const t = state.tick;
    state.tick += 1;
    const incoming = textFromInput(input);
    const speaker = pickSpeaker(state.lastSpeaker);
    const reactor = pickReactor(speaker, t);

    // every 3rd turn (1-based 3,6,9,..) the input prompts an OPENER from the bank
    const openerTurn = (t + 1) % 3 === 0;
    let role;
    let text;
    if (openerTurn) {
      role = 'opener';
      text = nextLine(openers[speaker], 'openers:' + speaker);
    } else if (incoming) {
      role = 'echo';
      text = incoming;
    } else {
      role = 'interject';
      text = nextLine(generic, 'interject:' + speaker);
    }

    // reaction reads from the directed pairing table; missing entries -> generic
    const pairKey = speaker + '->' + reactor;
    const reactText = nextLine(reacts[pairKey], 'reacts:' + pairKey);

    state.lastSpeaker = speaker;
    state.lastReactor = reactor;
    history.push({ tick: t, speaker, reactor });
    if (history.length > 24) history.shift();

    return {
      tick: t,
      speaker: { name: speaker, text, role },
      reactor: { name: reactor, text: reactText, role: 'react' },
    };
  }

  return { tick, state };
}