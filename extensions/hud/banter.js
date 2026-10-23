// menagerie hud — banter engine alias. Canonical implementation lives in
// banter.mjs (imported by tests and by this alias); this file is the plain-ESM
// handle named in the task so `import { createBanter } from './banter.js'` works.
export {
  AGENTS,
  PERSONA,
  NEUTRAL,
  FALLBACK_LINES,
  normalizeName,
  stripTags,
  textFromInput,
  personaStyle,
  createBanter,
} from './banter.mjs';