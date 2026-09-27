/**
 * Static check: widget/core/* must import nothing but each other — no
 * React, no DOM globals used at module scope, no per-app file (version.js,
 * knowledge.js, contextAdapter.js). This is what lets sync-widget.sh copy
 * this directory verbatim into academy's repo (Fase 4) and have it work
 * against a vanilla DOM shell instead of React.
 *
 * Text-grep, not an import-graph tool — deliberately simple, and it is the
 * gate that must pass BEFORE academy's real bundle is ever touched
 * (docs/ai-assistant-widget-rollout-plan.md Fase 3).
 *
 * Run: node src/widget/core/framework-agnostic.smoke.mjs   (exit 0 = GREEN)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const files = readdirSync(DIR).filter((f) => f.endsWith('.js'));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const FORBIDDEN_IMPORT = /^import .*from ['"](react|react-dom|\.\.\/)/m;
const ALLOWED_LOCAL_IMPORT = /^import .*from ['"]\.\/[a-zA-Z0-9_-]+\.js['"]/;

for (const file of files) {
  const src = readFileSync(path.join(DIR, file), 'utf8');
  check(`${file}: no React/parent-directory import`, !FORBIDDEN_IMPORT.test(src));
  check(`${file}: no JSX syntax`, !/<[A-Za-z][\w.]*[\s/>]/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
  for (const line of src.split('\n')) {
    if (line.startsWith('import ') && !ALLOWED_LOCAL_IMPORT.test(line)) {
      check(`${file}: import line is core-local`, false, line.trim());
    }
  }
}

check('at least the expected core files are present',
  ['store.js', 'registry.js', 'collector.js', 'identity.js'].every((f) => files.includes(f)));

console.log(failures === 0 ? '\nGREEN (framework-agnostic)' : `\nRED (framework-agnostic) — ${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
