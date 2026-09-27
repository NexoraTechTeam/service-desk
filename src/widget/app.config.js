/**
 * Readiness Widget — NexServe service-desk app config (rollout plan Fase 4):
 * the per-app values that widget/core/* is generic over. Accreditation and
 * academy each have their own copy of this file — widget/core/ is NEVER
 * edited per app (it is synced from accreditation by ops/prototypes/sync-widget.sh).
 *
 * Unlike accreditation, this app exports its OWN CHECK_AREAS here (the React
 * shell reads them from app.config and injects them into createStore, so the
 * shared core keeps its generic default untouched). PROTOTYPE_VERSION ties
 * every finding to the exact review surface it was recorded against — bump the
 * suffix whenever the prototype changes in a way that could invalidate prior
 * answers (new screens, changed rules, reworded flows).
 */
export const PROJECT_ID = 'nexserve';
export const PROTOTYPE_VERSION = '1.1.0-pilot.1';
export const WIDGET_VERSION = '0.1.0';

// The ops-level published app name — matches ops/prototypes/refresh.sh and the
// nginx /servicedesk/ + /widget-feedback/ locations. NOT the same namespace as
// PROJECT_ID (the widget's own localStorage/context key). The feedback
// collector groups NDJSON on disk by this name (/var/lib/nexora-feedback/servicedesk/).
export const FEEDBACK_APP = 'servicedesk';

// {label, question} objects, not bare strings, so a prompt's icon never goes
// stale when the question is reworded (rollout plan §3.2).
export const QUICK_PROMPTS = [
  { label: '🧭 Pandu review saya', question: 'Apa saja yang harus saya review di layar ini?' },
  { label: '🔀 Alur request', question: 'Bagaimana alur status sebuah request dari submit sampai closed?' },
  { label: '🔐 Otorisasi tim', question: 'Bagaimana agent hanya melihat request dari tim yang dia ikuti?' },
  { label: '🤖 AI Assist', question: 'Bagaimana AI Assist di Home mengubah kalimat bebas jadi request?' },
];

// Screen labels for every real App view (App() switch in ServiceDesk.jsx).
// The context adapter and the Node-run guidance gate read ONE source here.
export const SCREEN_LABELS = {
  home: 'Home (AI Assist & Quick Services)',
  catalog: 'Service Catalog',
  serviceDetail: 'Service Request Form',
  myRequests: 'My Requests',
  requestDetail: 'Request Detail',
  myBookings: 'My Bookings',
  roomBooking: 'Meeting Room Booking',
  vehicleBooking: 'Company Vehicle Booking',
  approvals: 'My Approvals',
  knowledge: 'Knowledge Base',
  managerHome: 'Manager Dashboard',
  pendingApprovals: 'Pending Approvals',
  teamRequests: 'Team Requests',
  agentQueue: 'Agent Queue',
  analytics: 'Analytics',
  slaPolicy: 'SLA Policy',
  serviceBuilder: 'Service Builder',
  serviceForm: 'Service Builder Form',
  teamsAccess: 'Teams & Access',
};

// Mandatory review areas for the service-desk prototype (the gate checklist).
// [key, title, description]. The React shell injects these into createStore,
// so the gate math and the checklist render from the SAME list.
export const CHECK_AREAS = [
  ['catalogIntake',    'Katalog & AI intake',            'Katalog layanan, quick services, dan AI Assist kalimat-bebas → form yang benar.'],
  ['requestLifecycle', 'Alur & status request',          'Lifecycle submit→approval→assign→progress→resolve→closed, timestamp riil, riwayat status.'],
  ['approvals',        'Persetujuan',                    'Approve/reject/minta info, jenis approver per layanan, batas approval.'],
  ['agentAssignment',  'Agent workspace & penugasan',    'Queue, assign-to-me, reassign, visibilitas ter-scope per tim/assignment group.'],
  ['teamRbac',         'Otorisasi tim (RBAC)',           'Keanggotaan tim, tanggal efektif, akses kadaluarsa otomatis dikecualikan.'],
  ['slaAnalytics',     'SLA & analitik',                 'Target & kepatuhan SLA, volume live vs baseline historis, coverage gap.'],
  ['serviceBuilder',   'Service Builder & template',     'Clone template → konfigurasi → publish, visibility scope, draft vs published.'],
  ['bookings',         'Booking & sumber daya',          'Booking ruang & kendaraan, ambang approval, konfirmasi vs pending.'],
  ['responseDelivery', 'Pengiriman respons & dokumen',   'Lampiran respons ke requester, document review & sign-off, edge/empty state.'],
];

// Fase 6 — screen-aware review guidance. Keys mirror CHECK_AREAS above. For
// each area: the real view route(s) where it is verified, and a prompt the
// knowledge base can actually answer. guidance.smoke.mjs asserts every route is
// a real screen and every prompt resolves ANSWERED_FROM_SOURCE, so a suggestion
// never sends the reviewer to a dead screen or a non-answer.
export const AREA_GUIDE = {
  catalogIntake:    { routes: ['home', 'catalog'],                         prompt: { label: '🤖 AI intake', question: 'Bagaimana AI Assist di Home mengubah kalimat bebas jadi request?' } },
  requestLifecycle: { routes: ['myRequests', 'requestDetail'],             prompt: { label: '🔀 Alur status', question: 'Bagaimana alur status sebuah request dari submit sampai closed?' } },
  approvals:        { routes: ['pendingApprovals', 'requestDetail'],       prompt: { label: '✅ Approval', question: 'Siapa yang menyetujui request dan apa saja jenis approver-nya?' } },
  agentAssignment:  { routes: ['agentQueue', 'requestDetail'],             prompt: { label: '🎯 Penugasan', question: 'Bagaimana agent menugaskan dan me-reassign request di queue?' } },
  teamRbac:         { routes: ['teamsAccess'],                             prompt: { label: '🔐 RBAC tim', question: 'Bagaimana agent hanya melihat request dari tim yang dia ikuti?' } },
  slaAnalytics:     { routes: ['slaPolicy', 'analytics'],                  prompt: { label: '📈 SLA', question: 'Bagaimana target SLA dan kepatuhannya ditampilkan?' } },
  serviceBuilder:   { routes: ['serviceBuilder', 'serviceForm'],          prompt: { label: '🧱 Builder', question: 'Bagaimana admin membuat layanan baru dari template library?' } },
  bookings:         { routes: ['myBookings', 'roomBooking', 'vehicleBooking'], prompt: { label: '📅 Booking', question: 'Kapan booking ruang atau kendaraan butuh approval?' } },
  responseDelivery: { routes: ['requestDetail'],                          prompt: { label: '📎 Respons', question: 'Bagaimana agent mengirim dokumen balasan ke requester?' } },
};
