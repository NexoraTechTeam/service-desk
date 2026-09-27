/**
 * Readiness Widget — NexServe source-grounded answer engine (dependency-free).
 *
 * Guardrails (docs/widget-readiness-ai-assistant.md §5):
 * - Answer ONLY from the app's own behavior / source below. No approved
 *   source → classification CLARIFICATION_NEEDED + suggestion to record a finding.
 * - NEVER present assumption as approved requirement; NEVER approve, assign
 *   blame, or make a decision — that stays with the human reviewer.
 * - Bilingual (ID/EN). Best-match wins: the rule with the most keyword hits
 *   answers, so specific questions beat generic ones. Manual rules here win
 *   over the auto-generated ones (knowledge.generated.js).
 *
 * Sources = the running NexServe prototype (ServiceDesk.jsx) + its own
 * in-app Knowledge Base + the widget experiment doc.
 */
import { GENERATED_RULES } from './knowledge.generated.js';
import { createAnswerEngine } from './core/engine.js';

export const SOURCES = {
  APP: 'runtime aplikasi NexServe (src/ServiceDesk.jsx)',
  CATALOG: 'Service Catalog (INITIAL_SERVICES / TEMPLATE_LIBRARY)',
  LIFECYCLE: 'alur status request (REQUEST_LIFECYCLE)',
  RBAC: 'otorisasi tim (TEAMS / TEAM_MEMBERSHIPS_SEED)',
  SLA: 'SLA Policy & Analytics (SLA_POLICY_DEFAULTS)',
  BUILDER: 'Service Builder & Template Library',
  KB: 'in-app Knowledge Base (KNOWLEDGE)',
  WIDGET: 'docs/widget-readiness-ai-assistant.md (experiment)',
  CODE: 'kode sumber (auto-generated dari ServiceDesk.jsx via scripts/gen-knowledge.mjs)',
};

const RULES = [
  {
    id: 'ai-assist-intake',
    match: ['ai assist', 'ai assistant', 'kalimat bebas', 'natural language', 'kalimat', 'bahasa alami', 'parseaiquery', 'intent', 'deteksi', 'home ai', 'ubah kalimat', 'ketik keluhan', 'apa yang bisa dibantu', 'understanding your request'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP', 'CATALOG'],
    answer: () =>
      `AI Assist di Home (parseAIQuery) memetakan kalimat bebas ke layanan yang tepat + prefill form — bukan LLM, melainkan rule-based intent + ekstraksi entitas:\n` +
      `• Deteksi intent lewat kata kunci (wifi/network → IT Incident; "meeting room" + jumlah orang → Meeting Room Booking; car/vehicle → Company Vehicle Booking; "employment letter" → HR Employment Letter; ac/leak → Facility Maintenance).\n` +
      `• Ekstraksi entitas: jumlah orang, waktu ("at 10"), tujuan kota, lantai, "tomorrow" → tanggal besok.\n` +
      `• Hasilnya kartu ringkasan (Detected intent + field) dengan tombol Continue ke form yang sudah terisi, atau "Not quite". Jika tak yakin cocok, ia jujur "could not confidently match" dan menawarkan Browse Catalog. Fallback terakhir mencocokkan keyword/nama layanan di katalog.`,
  },
  {
    id: 'request-lifecycle',
    match: ['alur status', 'lifecycle', 'siklus', 'submit sampai closed', 'tahapan', 'status request', 'urutan status', 'proses request', 'submitted', 'closed', 'resolved', 'in progress', 'pending approval', 'riwayat status', 'timestamp', 'status history'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['LIFECYCLE', 'APP'],
    answer: () =>
      `Alur status sebuah request (REQUEST_LIFECYCLE):\n` +
      `• Butuh approval: Submitted → Pending Approval → Approved → Assigned → In Progress → Resolved → Closed.\n` +
      `• Tanpa approval: Submitted → Assigned → In Progress → Resolved → Closed.\n` +
      `Status ditentukan approvalRequired layanan. Setiap transisi ditulis ke statusHistory dengan timestamp riil (nowTimestamp) — berbeda dari riwayat seed yang backfilled. Request yang Closed bisa di-reopen (→ In Progress).`,
  },
  {
    id: 'approvals',
    match: ['approval', 'menyetujui', 'setuju', 'approver', 'jenis approver', 'approvertype', 'reject', 'tolak', 'minta info', 'request info', 'siapa menyetujui', 'persetujuan', 'manager finance', 'butuh approval'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP', 'CATALOG'],
    answer: () =>
      `Persetujuan bergantung pada approverType layanan (bukan satu jalur seragam): mis. None, Manager, Manager + IT, Manager + IT + Data Owner, HR, Legal, Finance, Manager + Finance, Security, Procurement, dst. ` +
      `Layanan dengan approvalRequired=true masuk status Pending Approval; approver (persona Manager di Pending Approvals) bisa Approve, Reject, atau minta info tambahan (Pending). Approve/Reject mencatat transisi berikut timestamp. Beberapa layanan hanya butuh approval bersyarat (mis. ruang >10 kursi, di atas ambang biaya).`,
  },
  {
    id: 'agent-assignment',
    match: ['agent', 'queue', 'penugasan', 'assign', 'assign to me', 'reassign', 'me-reassign', 'tugaskan', 'ambil request', 'pindah tugas', 'assignee', 'agent queue', 'kerjakan request'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP', 'RBAC'],
    answer: () =>
      `Agent bekerja dari My Queue. Ia bisa Assign to me (assignToMe → reassign ke dirinya) atau Reassign ke anggota lain; saat request masih Submitted/Approved, penugasan menaikkannya ke Assigned dan mencatat timestamp. Dari Request Detail agent juga memajukan status (In Progress → Resolved → Closed). ` +
      `Yang terlihat di queue dibatasi assignment group tim tempat agent menjadi anggota aktif — bukan semua request (lihat otorisasi tim).`,
  },
  {
    id: 'team-rbac',
    match: ['otorisasi tim', 'rbac', 'membership', 'keanggotaan', 'tanggal efektif', 'effective', 'akses kadaluarsa', 'lapsed', 'tim yang dia ikuti', 'hanya melihat', 'authorized teams', 'teams access', 'multi team', 'single team', 'segregation'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['RBAC', 'APP'],
    answer: () =>
      `Otorisasi Agent Workspace bersumber dari User → Team → role-in-team → tanggal efektif (TEAM_MEMBERSHIPS_SEED), bukan dropdown "pilih tim bebas". getAuthorizedTeams() hanya mengembalikan tim yang keanggotaannya AKTIF hari ini (isMembershipActive: effectiveFrom ≤ hari ini ≤ effectiveUntil). ` +
      `Contoh: keanggotaan IT milik Dewi sengaja kadaluarsa → otomatis DIKECUALIKAN, bukan sekadar disembunyikan. Agent multi-tim (Rina) melihat gabungan tim aktifnya. Admin mengelola ini di Teams & Access (tambah/akhiri membership); mengakhiri membership men-set effectiveUntil = hari ini.`,
  },
  {
    id: 'sla-analytics',
    match: ['sla', 'target sla', 'kepatuhan', 'compliance', 'analytics', 'analitik', 'response', 'resolution', 'metrate', 'live request volume', 'volume', 'baseline', 'sla policy', 'ditampilkan'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['SLA', 'APP'],
    answer: () =>
      `SLA: tiap layanan punya target di SLA Policy (SLA_POLICY_DEFAULTS untuk layanan kurasi; lainnya memakai SLA katalognya, ditandai "belum direview formal"). Admin mengubah target (updateSlaTarget) — lastReviewed ikut ter-update. ` +
      `Analytics menampilkan tren bulanan & SLA-compliance sebagai baseline historis pra-go-live (jelas dilabeli, TIDAK dihitung ulang dari data live dan tidak dipalsukan untuk layanan baru). Panel "Live Request Volume" adalah yang nyata — dihitung dari array requests saat render, jadi layanan baru pun muncul begitu punya ≥1 request.`,
  },
  {
    id: 'service-builder',
    match: ['service builder', 'template', 'template library', 'clone', 'buat layanan', 'layanan baru', 'publish', 'draft', 'visibility scope', 'blueprint', 'konfigurasi layanan', 'admin buat', 'form builder'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['BUILDER', 'APP'],
    answer: () =>
      `Admin membuat layanan lewat Service Builder: Browse Template Library (22 domain blueprint) → Clone sebuah entri ke form → konfigurasi (nama, domain, ikon, form fields, approverType, assignment group, visibility scope, notifikasi, SLA) → Save sebagai draft atau Publish. ` +
      `Template murni data — tidak pernah tampil sebagai layanan yang bisa di-request sampai di-clone & publish. visibilityScope="all" atau dibatasi ke visibleDepartments tertentu. Layanan seed dan hasil Builder identik strukturnya (tidak ada yang "spesial" karena seed).`,
  },
  {
    id: 'bookings-resources',
    match: ['booking', 'ruang', 'meeting room', 'kendaraan', 'vehicle', 'mobil', 'ambang approval', 'butuh approval booking', 'reservasi', 'sumber daya', 'resource', 'kapan approval', 'confirmed', 'pending approval booking'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP', 'CATALOG'],
    answer: () =>
      `Booking sumber daya: Meeting Room Booking umumnya konfirmasi instan, KECUALI ruang di atas 10 kursi → butuh approval. Company Vehicle Booking butuh approval (Manager + GA); trip panjang bisa perlu approval Department Head. ` +
      `createBooking menetapkan status Confirmed (tanpa approval) atau Pending Approval (butuh approval). Booking tampil di My Bookings.`,
  },
  {
    id: 'response-delivery',
    match: ['kirim dokumen', 'dokumen balasan', 'balasan', 'requester', 'attach response', 'lampiran respons', 'document review', 'sign-off', 'signoff', 'board of directors', 'kirim ke requester', 'response attachment', 'document link', 'produces document'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP', 'CATALOG'],
    answer: () =>
      `Pengiriman respons: dari Request Detail, agent bisa melampirkan hasil (attachResponse: nama file atau link dokumen) yang lalu terlihat oleh requester (responseAttachmentName / responseDocumentLink) — mis. surat HR employment letter. ` +
      `Layanan ber-producesDocument (Contract Review, NDA, Vendor Security Review, dan Document Review & Sign-off) memang menghasilkan dokumen. "Document Review & Sign-off" me-rute dokumen ke Legal Review / Board of Directors Sign-off / Department Head Approval — link penyimpanan atau lampiran langsung.`,
  },
  {
    id: 'review-guide',
    match: ['review layar ini', 'apa yang direview', 'harus saya review', 'apa yang harus direview', 'panduan review', 'guide review', 'layar ini', 'what to review', 'review apa', 'area review'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['WIDGET', 'APP'],
    answer: (ctx) => {
      const screen = ctx?.screen || ctx?.route || 'layar ini';
      return `Di ${screen}, review-lah bahwa perilaku sesuai maksud: alur benar, status/otorisasi tepat, dan edge state ditangani. ` +
        `Area review wajib NexServe: (1) Katalog & AI intake, (2) Alur & status request, (3) Persetujuan, (4) Agent workspace & penugasan, (5) Otorisasi tim (RBAC), (6) SLA & analitik, (7) Service Builder & template, (8) Booking & sumber daya, (9) Pengiriman respons & dokumen. ` +
        `Gunakan chip saran di tab Ask untuk membuka layar tiap area, lalu centang area itu di tab Readiness. Temuan direkam sebagai finding (Anda yang memutuskan, bukan widget).`;
    },
  },
  {
    id: 'widget-gate-signoff',
    match: ['gate', 'sign-off', 'signoff', 'readiness', 'kesiapan', 'centang area', 'coverage', 'blocker', 'kapan siap', 'sudah siap', 'tanda tangan', 'finding', 'temuan', 'sign off'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['WIDGET'],
    answer: () =>
      `Widget review ini memakai gate biner: SIAP hanya jika 100% area review tercentang DAN 0 open blocker. Selama belum, sign-off DITOLAK dengan alasan persis "coverage N%, M open blocker(s)". ` +
      `Finding punya siklus open → accepted / rejected / superseded, dan hanya manusia (dengan identitas + catatan) yang boleh memutuskan — widget tidak pernah menyetujui atau memvonis. Semua jawaban hanya dari sumber; jika tak ada sumber, ia jujur bilang perlu klarifikasi, bukan mengarang.`,
  },
  {
    id: 'edge-states',
    match: ['edge', 'empty state', 'kosong', 'error state', 'no coverage', 'at risk', 'breached', 'coverage gap', 'stale', 'data kosong', 'tidak ada data', 'gap staffing', 'tim tanpa agent'],
    classification: 'ANSWERED_FROM_SOURCE',
    sources: ['APP'],
    answer: () =>
      `Edge/empty state yang layak diuji: SLA bisa bernilai On Track / At Risk / Breached / No Coverage (STATUS_STYLES). Manager Dashboard menandai Coverage Gap — tim tanpa agent aktif (cek roleInTeam === "Agent"), mis. IT Service Desk Team pada data seed. ` +
      `Layanan tanpa formFields jatuh ke GENERIC_FORM_FIELDS. Membership kadaluarsa dikecualikan otomatis. Uji juga daftar kosong (belum ada request/booking) dan request yang di-reopen setelah Closed.`,
  },
];

function summarize(list, n = 3) {
  return list.slice(0, n).join('; ');
}

function NOT_FOUND(candidates) {
  const hint = candidates && candidates.length
    ? ` Mungkin yang Anda maksud: ${summarize(candidates)}.`
    : '';
  return (
    `Belum ada sumber yang menjawab itu di dokumentasi/perilaku NexServe yang saya rujuk, jadi saya tidak akan mengarang.` +
    hint +
    ` Kalau ini memang gap requirement atau pertanyaan yang perlu dijawab tim, catat sebagai finding lewat tab Findings — itulah gunanya widget ini.`
  );
}

export const answerQuestion = createAnswerEngine({
  manualRules: RULES,
  generatedRules: GENERATED_RULES,
  sources: SOURCES,
  notFound: NOT_FOUND,
});

export const CLASSIFICATIONS = [
  'ANSWERED_FROM_SOURCE',
  'CLARIFICATION_NEEDED',
  'REQUIREMENT_GAP',
  'UNRESOLVED_QUESTION',
  'EDGE_CASE',
  'SUGGESTION',
  'CORRECTION',
  'PROTOTYPE_DEFECT',
  'IMPLEMENTATION_DEFECT',
  'CHANGE_REQUEST',
  'OUT_OF_SCOPE',
];
