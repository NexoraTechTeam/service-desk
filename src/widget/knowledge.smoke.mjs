/**
 * Knowledge matcher regression set (TDD, rollout plan Fase 4) — NexServe.
 * answerQuestion(question, ctx) -> {answer, sources, classification} is the
 * contract under test. A realistic reviewer question battery: every in-scope
 * question must answer FROM SOURCE; genuinely out-of-scope questions must stay
 * honest (CLARIFICATION_NEEDED), never forced into a bad match.
 * Run: node src/widget/knowledge.smoke.mjs   (exit 0 = GREEN)
 */
import { answerQuestion } from './knowledge.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

let answered = 0, asked = 0;
function expectAnswered(question, hint = '', ctx = {}) {
  asked += 1;
  const r = answerQuestion(question, ctx);
  const ok = r.classification === 'ANSWERED_FROM_SOURCE';
  if (ok) answered += 1;
  check(`"${question}" -> ANSWERED_FROM_SOURCE`, ok, ok ? '' : `got ${r.classification}`);
  if (ok && hint) check(`  ...mentions "${hint}"`, r.answer.toLowerCase().includes(hint.toLowerCase()));
}
function expectClarification(question) {
  const r = answerQuestion(question);
  check(`"${question}" -> CLARIFICATION_NEEDED (out of scope)`,
    r.classification === 'CLARIFICATION_NEEDED', `got ${r.classification}`);
}

// --- the 9 mandatory review-area prompts (must all answer) --------------
expectAnswered('Bagaimana AI Assist di Home mengubah kalimat bebas jadi request?', 'intent');
expectAnswered('Bagaimana alur status sebuah request dari submit sampai closed?', 'assigned');
expectAnswered('Siapa yang menyetujui request dan apa saja jenis approver-nya?', 'approvertype');
expectAnswered('Bagaimana agent menugaskan dan me-reassign request di queue?', 'reassign');
expectAnswered('Bagaimana agent hanya melihat request dari tim yang dia ikuti?', 'membership');
expectAnswered('Bagaimana target SLA dan kepatuhannya ditampilkan?', 'sla');
expectAnswered('Bagaimana admin membuat layanan baru dari template library?', 'template');
expectAnswered('Kapan booking ruang atau kendaraan butuh approval?', 'approval');
expectAnswered('Bagaimana agent mengirim dokumen balasan ke requester?', 'requester');

// --- quick prompts ------------------------------------------------------
expectAnswered('Apa saja yang harus saya review di layar ini?', 'area review', { screen: 'Agent Queue' });

// --- breadth: representative ID + EN questions --------------------------
expectAnswered('Apa itu NexServe?', 'service desk');
expectAnswered('Persona apa saja yang tersedia?', 'employee');
expectAnswered('Menu apa saja yang ada di aplikasi ini?');
expectAnswered('Tim apa saja yang menangani request?', 'assignment');
expectAnswered('Layanan apa saja yang bisa saya ajukan?', 'domain');
expectAnswered('Bagaimana otorisasi tim bekerja untuk agent?', 'aktif');
expectAnswered('Apa arti status At Risk atau Breached?', 'coverage');
expectAnswered('Apa itu gate dan sign-off di widget review ini?', 'blocker');
expectAnswered('Bagaimana coverage gap ditampilkan di manager dashboard?', 'gap');
expectAnswered('Apa itu Document Review & Sign-off?', 'board');
expectAnswered('what is the request lifecycle from submit to closed?', 'closed');
expectAnswered('kenapa scheme, eh, request ini masih pending approval?', 'approval');

// --- genuinely out of scope: must stay honest --------------------------
expectClarification('bagaimana cuaca hari ini di Jakarta?');
expectClarification('siapa presiden Indonesia saat ini?');
expectClarification('tolong buatkan saya resep nasi goreng');
expectClarification('berapa harga saham perusahaan ini di bursa?');

const coverage = Math.round((answered / asked) * 100);
console.log(`\nKB coverage in-scope: ${answered}/${asked} = ${coverage}%`);
console.log(failures === 0 ? 'GREEN (knowledge)' : `RED (knowledge) — ${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
