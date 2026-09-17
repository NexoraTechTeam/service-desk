# Service Desk (NexServe) — AGENTS.md

> Klasifikasi: `nexora` — approval lebih ketat untuk push/merge/deploy.

## Stack
- App: `src/ServiceDesk.jsx` — single-file React (3301 baris, `export default App`),
  hanya dependensi `react` + `lucide-react`. Data demo tenant fiktif
  "Nusantara Digital Group", user Bima Saputra.
- Host: Vite 5 + React 18, styling via Tailwind CDN di `index.html`
  (532 `className` Tailwind di file sumber — belum ada build Tailwind lokal).
- File asli: `03 - Service Desk.jsx` (Downloads) disalin apa adanya menjadi
  `src/ServiceDesk.jsx`; `src/App.jsx` hanya me-render-nya.

## Cara running lokal (AI-Workspace)
```bash
npm install                 # sekali saja
npm run dev                 # http://localhost:5174 (strictPort)
npm run build && npm run preview   # preview hasil build
```

## Aturan kerja di repo ini
1. `ServiceDesk.jsx` = file prototipe tunggal. Ubah seperlunya; kalau membesar,
   pecah per domain (requests, services, teams, analytics) mengikuti pola
   `nexora/accreditation/nexaccred-react/src/`.
2. Data masih in-memory/sample — belum ada backend, auth, atau persistensi.
3. Jangan commit: `node_modules/`, `dist/`, `.DS_Store` (sudah di `.gitignore`).
4. Branch kerja terisolasi, push hanya ke `dev`/`staging`, tidak pernah ke `main/master/production/prod`.
```

## Peta view di dalam App
`home`, `services`, `knowledge`, `managerHome`, `pendingApprovals`,
`teamRequests`, `agentQueue`, `analytics`, `slaPolicy`, `serviceBuilder`,
`serviceForm`, `teamsAccess` — navigasi via `goTo(view)`.
