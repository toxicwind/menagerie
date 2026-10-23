// menagerie hud — banter engine tests.
// Verifies the turn-taking state machine (deterministic rotation, pairing-table
// reactions, opener cadence, generic fallbacks), persona styling, the banter.js
// alias, and the drift guard: content.js must embed an exact copy of the
// banter.mjs body (minus `export` prefixes).
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hud = join(__dirname, '..', 'extensions', 'hud');

import {
  AGENTS,
  PERSONA,
  NEUTRAL,
  FALLBACK_LINES,
  personaStyle,
  createBanter,
  textFromInput,
  normalizeName,
} from '../extensions/hud/banter.mjs';
import * as alias from '../extensions/hud/banter.js';

const lines = JSON.parse(readFileSync(join(hud, 'lines.json'), 'utf8'));

const textsOf = (turns) => turns.map((t) => [t.speaker.text, t.reactor.text]).flat();

describe('module shape', () => {
  test('exports banter.js and banter.mjs produce the same API', () => {
    expect(typeof createBanter).toBe('function');
    expect(typeof personaStyle).toBe('function');
    expect(alias.createBanter).toBe(createBanter);
    expect(alias.personaStyle).toBe(personaStyle);
  });

  test('AGENTS is the deterministic rotation order', () => {
    expect(AGENTS).toEqual(['Clippy', 'Bonzi', 'Rowdy']);
  });
});

describe('turn-taking state machine', () => {
  test('speakers alternate Clippy -> Bonzi -> Rowdy and never repeat', () => {
    const b = createBanter(lines);
    const turns = Array.from({ length: 9 }, () => b.tick({}));
    const speakers = turns.map((t) => t.speaker.name);
    expect(speakers.slice(0, 3)).toEqual(['Clippy', 'Bonzi', 'Rowdy']);
    for (let i = 1; i < speakers.length; i += 1) {
      expect(speakers[i]).not.toBe(speakers[i - 1]);
    }
  });

  test('exactly two turns per tick (speaker + reactor), never the same agent', () => {
    const b = createBanter(lines);
    for (let i = 0; i < 9; i += 1) {
      const turn = b.tick({});
      expect(Object.keys(turn).sort()).toEqual(['reactor', 'speaker', 'tick']);
      expect(turn.speaker.name).not.toBe(turn.reactor.name);
      expect(AGENTS).toContain(turn.speaker.name);
      expect(AGENTS).toContain(turn.reactor.name);
    }
  });

  test('reactors rotate through the pairing table (all 6 directed pairs)', () => {
    const b = createBanter(lines);
    const pairs = Array.from({ length: 6 }, () => b.tick({})).map((t) => `${t.speaker.name}->${t.reactor.name}`);
    expect(pairs).toEqual([
      'Clippy->Bonzi',
      'Bonzi->Rowdy',
      'Rowdy->Clippy',
      'Clippy->Rowdy',
      'Bonzi->Clippy',
      'Rowdy->Bonzi',
    ]);
  });

  test('reaction lines come from the directed pairing table', () => {
    const b = createBanter(lines);
    for (let i = 0; i < 6; i += 1) {
      const t = b.tick({});
      const bank = lines.reacts[`${t.speaker.name}->${t.reactor.name}`];
      expect(bank).toContain(t.reactor.text);
    }
  });

  test('every 3rd tick (1-based 3,6,9,..) the speaker opens from openers[speaker]', () => {
    const b = createBanter(lines);
    const turns = Array.from({ length: 9 }, () => b.tick({}));
    turns.forEach((t, i) => {
      if ((i + 1) % 3 === 0) {
        expect(t.speaker.role).toBe('opener');
        expect(lines.openers[t.speaker.name]).toContain(t.speaker.text);
      } else {
        expect(t.speaker.role).not.toBe('opener');
      }
    });
  });

  test('incoming event/vision text is echoed by the speaker on non-opener ticks', () => {
    const b = createBanter(lines);
    const turns = [
      b.tick({ event: '<b>form saved</b>' }),
      b.tick({ vision: 'a modal opened' }),
      b.tick({ event: 'third tick is an opener, not an echo' }),
      b.tick({ event: 'fourth tick echoes again' }),
    ];
    expect(turns[0].speaker.role).toBe('echo');
    expect(turns[0].speaker.text).toBe('form saved');
    expect(turns[1].speaker.role).toBe('echo');
    expect(turns[1].speaker.text).toBe('a modal opened');
    expect(turns[2].speaker.role).toBe('opener');
    expect(turns[2].speaker.text).not.toContain('third tick');
    expect(turns[3].speaker.role).toBe('echo');
    expect(turns[3].speaker.text).toBe('fourth tick echoes again');
  });

  test('missing pairing entry falls back to provided generic_reactions', () => {
    const hacked = structuredClone(lines);
    delete hacked.reacts['Clippy->Bonzi'];
    const b = createBanter(hacked);
    const t = b.tick({}); // tick 0: Clippy -> Bonzi, react bank deleted
    expect(t.reactor.text).toBeOneOf(hacked.generic_reactions);
  });

  test('no lines at all -> falls back to built-in generic reactions', () => {
    const b = createBanter();
    const all = textsOf(Array.from({ length: 6 }, () => b.tick({})));
    for (const txt of all) {
      expect(FALLBACK_LINES.generic_reactions).toContain(txt);
    }
  });

  test('deterministic: same instance inputs -> identical output', () => {
    const inputs = [{}, { event: 'x' }, { vision: 'y' }, { event: 'z' }, {}, { vision: 'w' }];
    const run = () => {
      const b = createBanter(lines);
      return inputs.map((inp) => b.tick(inp));
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  test('state tracks tick, last speakers, and history', () => {
    const b = createBanter(lines);
    b.tick({ event: 'one' });
    b.tick({ event: 'two' });
    expect(b.state.tick).toBe(2);
    expect(b.state.lastSpeaker).toBe('Bonzi');
    expect(b.state.lastReactor).toBe('Rowdy');
    expect(b.state.history).toHaveLength(2);
    expect(b.state.history[0]).toEqual({ tick: 0, speaker: 'Clippy', reactor: 'Bonzi' });
  });
});

describe('persona style', () => {
  test('returns the agreed per-persona accent colors', () => {
    expect(personaStyle('Clippy').color).toBe('#4f9dff');
    expect(personaStyle('Bonzi').color).toBe('#b06eff');
    expect(personaStyle('Rowdy').color).toBe('#d9a066');
  });

  test('is case-insensitive ("rowdy" == "Rowdy") and returns css', () => {
    const r = personaStyle('rowdy');
    expect(r.name).toBe('Rowdy');
    expect(r.css).toContain('#d9a066');
    expect(r.tail).toBe('#d9a066');
    expect(r.border).toContain('1px solid');
  });

  test('unknown personas fall back to a neutral tone', () => {
    expect(personaStyle('taxman').color).toBe(NEUTRAL.color);
    expect(personaStyle('Clppy'[0] + 'lippy').color).toBe(PERSONA.Clippy.color); // typo-ish names still normalize
    expect(personaStyle('').name).toBe('Clippy');
  });
});

describe('text helpers', () => {
  test('textFromInput strips tags and honors event/vision/text/what', () => {
    expect(textFromInput({ event: '<b>bold</b> event' })).toBe('bold event');
    expect(textFromInput({ vision: 'see <i>this</i>' })).toBe('see this');
    expect(textFromInput({ text: 'plain' })).toBe('plain');
    expect(textFromInput({ what: 'button' })).toBe('button');
    expect(textFromInput({})).toBe('');
    expect(normalizeName('rowdy')).toBe('Rowdy');
  });
});

describe('drift guard: content.js inline engine mirrors banter.mjs', () => {
  test('inline copy inside content.js is the module body without `export`', () => {
    const content = readFileSync(join(hud, 'content.js'), 'utf8');
    const moduleSrc = readFileSync(join(hud, 'banter.mjs'), 'utf8');

    const m = content.match(/\/\/ ==banter engine==\n([\s\S]*?)\n  \/\/ ==end banter engine==/);
    expect(m).not.toBeNull();
    const inline = m[1];

    const body = moduleSrc.slice(moduleSrc.indexOf('export const AGENTS'));
    const stripped = body
      .split('\n')
      .map((l) => (l.startsWith('export ') ? l.slice('export '.length) : l))
      .join('\n');

    const norm = (s) =>
      s
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//'))
        .join('\n');

    expect(norm(inline)).toBe(norm(stripped));
  });
});