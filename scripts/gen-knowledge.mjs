#!/usr/bin/env node
/**
 * Generates src/widget/knowledge.generated.js from the app's OWN source of
 * truth — src/ServiceDesk.jsx (NAV_ITEMS_BY_PERSONA, QUICK_SIGNIN_OPTIONS,
 * REQUEST_LIFECYCLE, TEAMS, SLA_POLICY_DEFAULTS, INITIAL_SERVICES,
 * TEMPLATE_LIBRARY, KNOWLEDGE) — so navigation / lifecycle / team / catalog
 * questions never go stale the way a hand-written list would (rollout plan
 * Fase 4; for service-desk the code IS the documentation).
 *
 * Text-regex parsing on purpose, not a JS/JSX AST: the single source file is a
 * set of stable object/array literals, and a full parser dependency is not
 * worth it. Block-splitting (not one lazy mega-regex) avoids the class of bug
 * where optional groups silently drop. Run: npm run gen:knowledge
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(ROOT, 'src/ServiceDesk.jsx'), 'utf8');

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const uniq = (a) => [...new Set(a)];

// Pull a top-level `const NAME = <open>...<close>;` block by balanced-ish slice.
function blockOf(name, open, close) {
  const re = new RegExp(`const ${name} = \\${open}`);
  const m = src.match(re);
  if (!m) return null;
  const start = m.index + m[0].length;
  // find the matching close at column 0-ish: the literal `\n${close};`
  const endRe = new RegExp(`\\n\\${close};`);
  const rest = src.slice(start);
  const em = rest.match(endRe);
  if (!em) return null;
  return rest.slice(0, em.index);
}

// --- NAV_ITEMS_BY_PERSONA: persona -> [{key,label}] ------------------------
function parseNav() {
  const block = blockOf('NAV_ITEMS_BY_PERSONA', '{', '}');
  if (!block) return {};
  const out = {};
  // each persona: `employee: [ ... ],`
  for (const pm of (block + '\n').matchAll(/(\w+):\s*\[([\s\S]*?)\],?\n/g)) {
    const persona = pm[1];
    const items = [];
    for (const im of pm[2].matchAll(/\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)) {
      items.push({ key: im[1], label: im[2] });
    }
    if (items.length) out[persona] = items;
  }
  return out;
}

// --- QUICK_SIGNIN_OPTIONS: roleLabel list ----------------------------------
function parsePersonas() {
  const block = blockOf('QUICK_SIGNIN_OPTIONS', '[', ']');
  if (!block) return [];
  return [...block.matchAll(/roleLabel:\s*"([^"]+)"/g)].map((m) => m[1]);
}

// --- REQUEST_LIFECYCLE: {standard:[...], noApproval:[...]} ------------------
function parseLifecycle() {
  const block = blockOf('REQUEST_LIFECYCLE', '{', '}');
  if (!block) return {};
  const grab = (k) => {
    const m = block.match(new RegExp(`${k}:\\s*\\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  };
  return { standard: grab('standard'), noApproval: grab('noApproval') };
}

// --- TEAMS: [{name, domain, assignmentGroups:[...]}] -----------------------
function parseTeams() {
  const block = blockOf('TEAMS', '[', ']');
  if (!block) return [];
  const teams = [];
  for (const m of block.matchAll(/\{\s*id:\s*"[^"]+",\s*name:\s*"([^"]+)",\s*domain:\s*"([^"]+)",\s*assignmentGroups:\s*\[([^\]]*)\]/g)) {
    teams.push({
      name: m[1], domain: m[2],
      groups: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
    });
  }
  return teams;
}

// --- SLA_POLICY_DEFAULTS: id -> target -------------------------------------
function parseSla() {
  const block = blockOf('SLA_POLICY_DEFAULTS', '{', '}');
  if (!block) return [];
  return [...block.matchAll(/"([^"]+)":\s*\{\s*target:\s*"([^"]+)"/g)].map((m) => ({ id: m[1], target: m[2] }));
}

// --- INITIAL_SERVICES: name + domain ---------------------------------------
function parseServices() {
  const block = blockOf('INITIAL_SERVICES', '[', ']');
  if (!block) return [];
  const svc = [];
  for (const m of block.matchAll(/id:\s*"[^"]+",\s*name:\s*"([^"]+)",\s*domain:\s*"([^"]+)"/g)) {
    svc.push({ name: m[1], domain: m[2] });
  }
  return svc;
}

// --- TEMPLATE_LIBRARY: distinct domains ------------------------------------
function parseTemplateDomains() {
  const block = blockOf('TEMPLATE_LIBRARY', '[', ']');
  if (!block) return [];
  return uniq([...block.matchAll(/domain:\s*"([^"]+)"/g)].map((m) => m[1]));
}

// --- KNOWLEDGE: [{category,title,body}] ------------------------------------
function parseKnowledge() {
  const block = blockOf('KNOWLEDGE', '[', ']');
  if (!block) return [];
  const kb = [];
  for (const m of block.matchAll(/category:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*body:\s*"([^"]+)"/g)) {
    kb.push({ category: m[1], title: m[2], body: m[3] });
  }
  return kb;
}

const nav = parseNav();
const personas = parsePersonas();
const lifecycle = parseLifecycle();
const teams = parseTeams();
const sla = parseSla();
const services = parseServices();
const templateDomains = parseTemplateDomains();
const knowledge = parseKnowledge();

const personaKeys = Object.keys(nav);
if (personaKeys.length === 0 || services.length === 0 || teams.length === 0) {
  console.error('gen-knowledge: parsed 0 personas / services / teams — ServiceDesk.jsx shape probably changed, refusing to emit a broken KB');
  process.exit(1);
}

const rules = [];

// 1. app overview
rules.push({
  id: 'gen-app-overview',
  match: ['apa itu nexserve', 'nexserve itu apa', 'aplikasi ini untuk apa', 'apa itu service desk', 'service desk itu apa', 'what is nexserve', 'tentang aplikasi', 'employee experience', 'portal apa ini'],
  classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
  answerText: `NexServe adalah portal Employee Experience / Enterprise Service Desk (tenant demo "Nusantara Digital Group"). Karyawan mengajukan request lewat katalog layanan atau AI Assist kalimat-bebas; request mengalir melalui approval, penugasan ke tim, sampai selesai. Ada ${personaKeys.length} persona (${personaKeys.join(', ')}); quick sign-in menyediakan ${personas.length} pilihan: ${personas.join(', ')}. Data contoh in-memory, tanpa backend/persistensi.`,
});

// 2. personas / getting started
rules.push({
  id: 'gen-personas',
  match: ['persona apa saja', 'role apa saja', 'peran apa saja', 'siapa saja pengguna', 'user apa saja', 'daftar persona', 'login sebagai apa', 'personas', 'mulai dari mana', 'cara login', 'quick sign'],
  classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
  answerText: `Quick sign-in menyediakan persona: ${personas.join(', ')}. Tiap persona punya menu dan wewenang berbeda. Pilih salah satu di layar login untuk masuk langsung ke workspace persona itu (Employee→Home, Manager→Dashboard, Agent→Queue, Admin→Service Builder).`,
});

// 3. nav overview (all personas)
rules.push({
  id: 'gen-nav-overview',
  match: ['menu apa saja', 'ada menu apa', 'daftar menu', 'semua menu', 'nav apa saja', 'all menu', 'modul', 'module', 'fitur', 'feature', 'navigasi', 'sitemap', 'halaman apa saja', 'menu'],
  classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
  answerText: `Menu per persona (sumber: ServiceDesk.jsx#NAV_ITEMS_BY_PERSONA): ` +
    personaKeys.map((p) => `${p}: ${nav[p].map((i) => i.label).join(', ')}`).join(' · ') + '.',
});

// 3b. per-persona nav rules
for (const p of personaKeys) {
  rules.push({
    id: `gen-nav-${p}`,
    match: [`menu ${p}`, `${p} bisa apa`, `sebagai ${p}`, `akses ${p}`, `${p} melihat apa`, `navigasi ${p}`],
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `Persona ${p} melihat menu: ${nav[p].map((i) => i.label).join(', ')}.`,
  });
}

// 4. lifecycle
if (lifecycle.standard?.length) {
  rules.push({
    id: 'gen-lifecycle',
    match: ['alur status', 'lifecycle', 'siklus request', 'status apa saja', 'tahapan request', 'dari submit sampai', 'proses request', 'urutan status', 'closed', 'resolved', 'in progress', 'pending approval'],
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `Alur status request (sumber: REQUEST_LIFECYCLE): layanan dengan approval → ${lifecycle.standard.join(' → ')}. Layanan tanpa approval → ${lifecycle.noApproval.join(' → ')}. Setiap perubahan status dicatat dengan timestamp riil (nowTimestamp) di riwayat status.`,
  });
}

// 5. teams / assignment groups
rules.push({
  id: 'gen-teams',
  match: ['tim apa saja', 'daftar tim', 'assignment group', 'grup penugasan', 'teams', 'tim penanganan', 'siapa menangani', 'domain tim', 'kelompok agent'],
  classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
  answerText: `Ada ${teams.length} tim (sumber: TEAMS). Tiap tim memiliki assignment group yang jadi target routing: ` +
    teams.map((t) => `${t.name} [${t.domain}] → ${t.groups.join(', ')}`).join(' · ') + '. Satu identitas hanya melihat tim tempat keanggotaannya sedang aktif (RBAC berbasis membership + tanggal efektif).',
});

// 6. SLA
if (sla.length) {
  rules.push({
    id: 'gen-sla',
    match: ['sla', 'target sla', 'berapa lama', 'response time', 'resolution time', 'kepatuhan sla', 'sla policy', 'batas waktu layanan'],
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `Target SLA per layanan (sumber: SLA_POLICY_DEFAULTS): ` +
      sla.slice(0, 10).map((s) => `${s.id}: ${s.target}`).join(' · ') +
      `. Layanan Wave 2 / hasil Service Builder memakai SLA katalognya sendiri (ditandai belum direview formal). Panel kepatuhan SLA adalah baseline historis; "Live Request Volume" dihitung dari data request nyata saat render.`,
  });
}

// 7. catalog (services by domain)
{
  const byDomain = {};
  for (const s of services) (byDomain[s.domain] ||= []).push(s.name);
  rules.push({
    id: 'gen-catalog',
    match: ['layanan apa saja', 'katalog', 'service catalog', 'daftar layanan', 'services', 'bisa request apa', 'apa yang bisa diajukan', 'domain layanan'],
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `Katalog layanan (sumber: INITIAL_SERVICES), per domain: ` +
      Object.entries(byDomain).map(([d, ns]) => `${d}: ${ns.join(', ')}`).join(' · ') + '.',
  });
}

// 8. template library domains
if (templateDomains.length) {
  rules.push({
    id: 'gen-templates',
    match: ['template', 'template library', 'blueprint', 'clone layanan', 'domain template', 'buat layanan baru', 'service builder template', 'katalog template'],
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `Template Library mencakup ${templateDomains.length} domain (sumber: TEMPLATE_LIBRARY): ${templateDomains.join(', ')}. Admin meng-clone sebuah template ke Service Builder, mengkonfigurasi, lalu publish — barulah ia menjadi layanan nyata. Template sendiri tidak pernah tampil sebagai layanan yang bisa di-request.`,
  });
}

// 9. per-KNOWLEDGE-entry rules
for (let i = 0; i < knowledge.length; i++) {
  const k = knowledge[i];
  rules.push({
    id: `gen-kb-${i + 1}`,
    match: uniq(k.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3).concat([k.category.toLowerCase(), k.title.toLowerCase()])),
    classification: 'ANSWERED_FROM_SOURCE', sources: ['CODE'],
    answerText: `[${k.category}] ${k.title}: ${k.body}`,
  });
}

const header = `/**
 * AUTO-GENERATED by scripts/gen-knowledge.mjs from src/ServiceDesk.jsx —
 * do not hand-edit. Re-run \`npm run gen:knowledge\` after the app source
 * changes.
 *
 * Manual KB (src/widget/knowledge.js) wins over this file on any tie or higher
 * score — this exists to fill navigation / lifecycle / team / catalog
 * questions that the manual KB leaves empty, not to compete with it.
 */
`;

const body = `export const GENERATED_RULES = [\n${rules.map((r) => `  {\n` +
  `    id: '${r.id}',\n` +
  `    match: [${r.match.map((k) => `'${esc(k)}'`).join(', ')}],\n` +
  `    classification: '${r.classification}',\n` +
  `    sources: [${r.sources.map((s) => `'${s}'`).join(', ')}],\n` +
  `    answer: () => \`${esc(r.answerText)}\`,\n` +
  `  },\n`).join('')}];\n`;

mkdirSync(path.join(ROOT, 'src/widget'), { recursive: true });
writeFileSync(path.join(ROOT, 'src/widget/knowledge.generated.js'), header + '\n' + body);
console.log(`gen-knowledge: wrote ${rules.length} rules (personas=${personaKeys.length}, teams=${teams.length}, services=${services.length}, templates=${templateDomains.length}, kb=${knowledge.length}) to src/widget/knowledge.generated.js`);
