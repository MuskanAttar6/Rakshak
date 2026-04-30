# Rakshak — System Health Checker

A cross-platform desktop utility (Windows + Linux) that audits whether your machine is in good shape for development work. Built with **Electron + React + Node.js**.

It shows a circular **health score**, a list of issues with **OK / Warning / Critical** indicators, expandable details, and actionable suggestions. Runs automatically on startup and on demand.

---

## Features

- Circular animated health score (0–100%)
- Color-coded issue list (green / yellow / red) with expandable details + suggestions
- Manual **Run Scan** button + auto-scan on launch
- Modern dark UI, smooth animations, reusable components
- Plugin-based **check modules** — drop a file into `/checks` to add a new check
- OS abstraction layer — PowerShell on Windows, shell on Linux
- Async/parallel execution for fast scans
- Tray icon + native notification when health drops below 60%
- Auto-launch on system login (production builds)

---

## Folder structure

```
rakshak/
├── electron/            # Electron main + preload
│   ├── main.js
│   └── preload.js
├── core/                # Core engine (loads checks, scores, aggregates)
│   └── engine.js
├── checks/              # Plugin-based check modules
│   ├── cpu.js
│   ├── ram.js
│   ├── disk.js
│   ├── internet.js
│   ├── updates.js
│   ├── git.js
│   ├── docker.js
│   ├── win-startup-apps.js
│   ├── win-defender.js
│   ├── win-firewall.js
│   ├── win-critical-services.js
│   ├── linux-load-average.js
│   ├── linux-failed-services.js
│   ├── linux-firewall.js
│   └── linux-log-errors.js
├── os/                  # OS abstraction layer
│   ├── index.js         # picks windows.js or linux.js
│   ├── shell.js         # exec helpers (run, runPS)
│   ├── windows.js
│   └── linux.js
├── src/                 # React renderer (UI layer)
│   ├── index.html
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   └── components/
│       ├── ScoreRing.jsx
│       ├── IssueItem.jsx
│       └── IssueList.jsx
├── vite.config.js
└── package.json
```

---

## How a check module works

Each file in `/checks` exports an object:

```js
module.exports = {
  id: 'unique-id',
  name: 'Human-readable name',
  category: 'common',          // 'common' | 'windows' | 'linux'
  platform: 'win32',           // optional — limit to platform
  async run() {
    return {
      status: 'ok' | 'warning' | 'critical',
      message: 'Short human-readable summary',
      suggestion: 'What the user should do',
      details: { /* optional structured data */ }
    };
  }
};
```

The core engine auto-discovers files in `/checks`, filters by the current platform, runs them in parallel, and computes the score:

| Status   | Points |
| -------- | ------ |
| ok       | 1.0    |
| warning  | 0.5    |
| critical | 0.0    |

Final score = `round((earned / total) * 100)`.

Adding a new check is as easy as dropping a new file in `/checks` — no other code needs to change.

---

## Running

### Prerequisites

- Node.js 18+
- npm 9+
- Windows 10/11 _or_ a modern Linux distro (with `systemctl`, `ping`, `df`)

### Install

```bash
npm install
```

### Develop (hot-reload renderer + Electron)

```bash
npm run dev
```

This runs Vite (renderer) at `http://localhost:5173` and launches Electron once the renderer is ready.

### Build production bundle

```bash
npm run build
```

Produces an installer in `release/` (NSIS on Windows, AppImage on Linux) via `electron-builder`.

### Run a production build without packaging

```bash
npm run build:renderer
npm start
```

---

## Notes & permissions

- **Windows Defender / Firewall checks** use `Get-MpComputerStatus` and `Get-NetFirewallProfile`. They work without admin but a few PowerShell cmdlets may return less detail when run unelevated.
- **Pending updates** on Windows uses the Windows Update COM API and may take several seconds.
- **Linux firewall** check tries `ufw` first, then `iptables`. `ufw status` requires the user to be in the right group or sudoers — otherwise it falls back gracefully.
- **Docker check** simply tests `docker --version` and `docker info`. No daemon socket is opened.
- All check failures are caught and downgraded to a `warning` so a single broken check never blocks the whole scan.

---

## Extending

- **Add a new check** → create a new file in `/checks` exporting `{ id, name, run }`.
- **Add a new OS function** → add it to `os/windows.js` and `os/linux.js` with the same name; check modules call it via `require('../os')`.
- **Tweak the score formula** → edit `STATUS_POINTS` or `calculateScore` in `core/engine.js`.
