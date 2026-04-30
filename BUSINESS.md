# Rakshak — Business Case

> **रक्षक** (Sanskrit) = *Protector*. Rakshak protects developer productivity and company assets by enforcing system-health hygiene **before** problems become outages.

---

## The problem

Every engineering org silently bleeds money to **broken developer machines**:

- Disks at 99% → builds fail silently, IDEs hang, Docker pulls error out
- Outdated AV / firewall off → security audits fail, devices flagged in SOC2 / ISO27001 reviews
- Slow / unstable Wi-Fi → 30+ minutes lost daily per engineer on flaky video calls and git pushes
- Devs working from cafés on residential Wi-Fi without VPN → IP allow-lists block them, support tickets pile up
- Outdated OS / unpatched CVEs → IT sees this only **after** an incident
- 30+ startup apps → laptop takes 8 minutes to be usable in the morning

Today this is "fixed" by:
- **IT support tickets** (slow, expensive, reactive)
- **MDM dashboards** (Intune / Jamf — admin-side only, no actionable feedback to user)
- **Tribal knowledge** ("did you try restarting?")

There is **no tool that tells a developer, in real time, "your machine is not ready for work today, here is why, here is the one-click fix"** — and **enforces it**.

That is Rakshak.

---

## What makes Rakshak unique

| Existing tools | Rakshak |
|---|---|
| MDM / RMM (admin only) | Developer-facing, friendly UI |
| Static AV scans | Live, multi-dimensional health score |
| Generic system info (Speccy, etc.) | Opinionated for **developer workflows** (Git, Docker, VPN, build tooling) |
| Passive notifications | **Blocking gate** for critical issues — user *must* fix or acknowledge |
| One-shot scripts | Plugin-based architecture — every team can add their own checks |
| Closed-source, OS-bundled | Cross-platform (Win + Linux), open architecture |

### Three differentiators

1. **The Critical Gate.**
   When something would damage productivity *or the machine itself* (failing AV, firewall off, disk at 99%, no network), Rakshak shows a **non-scrollable, one-screen blocking dialog** with one-click fixes. Users cannot just dismiss a tray notification — they must fix or explicitly acknowledge the risk. This is the single biggest behavioural change vs. existing tools.

2. **Developer-aware checks.**
   Disk space + Git config + Docker daemon + VPN/ASN + outbound speed are all first-class citizens. We are not just an OS dashboard — we know what an engineer needs to be productive.

3. **Plugin architecture.**
   Each team plugs in their own checks (e.g. "VPN connected to corp-east", "kubectl context not prod", "no uncommitted changes older than 7 days"). Drop one file in `/checks` — zero refactor.

---

## Internal use cases (sell it inside your own company)

1. **Onboarding.** New hire's machine is auto-audited day 1: disk, AV, VPN, Git, Docker, allowed-ASN. IT gets a green/red dashboard instead of 40 first-day tickets.
2. **Pre-meeting health.** Run before standup → if Wi-Fi is bad, user knows *before* they crash the meeting.
3. **Compliance evidence.** Per-machine health snapshots auto-collected → audit logs for SOC2 / ISO 27001 control evidence.
4. **Helpdesk deflection.** ~30% of L1 tickets ("my machine is slow", "VPN won't connect", "build failed") are pre-empted by Rakshak's actionable suggestions.
5. **Asset hygiene.** IT sees machines with chronic disk/RAM/AV issues *proactively* and can plan refresh cycles or upgrades.

**Quantified impact (conservative, per 100 engineers):**
- 10 min/day saved per engineer on flaky network / disk / build env = **~415 hours/month**
- 30% fewer L1 IT tickets = ~$4–6k/month at typical MSP rates
- Compliance audit prep: weeks → hours

---

## Productisation paths

### 1. Open-core (developer freemium)
- **Free:** Local app, all OSS checks, no telemetry.
- **Pro ($5–9 / dev / month):** auto-updating check pack, private check repo, custom branding, offline installer.

### 2. Team / Enterprise SaaS ($15–25 / dev / month)
- **Central dashboard** for IT showing fleet health (web app).
- **Policy engine:** "all developers must have AV on + VPN to corp-ASN before accessing internal Git" — enforced via the Critical Gate.
- **Compliance pack:** SOC2, ISO27001, HIPAA-aligned check templates + exportable evidence.
- **SSO + RBAC** (Okta, Azure AD, Google Workspace).
- **MDM bridge:** read posture from Intune / Jamf, write Rakshak posture back.

### 3. Vertical add-ons
- **Rakshak for Finance / Healthcare** — pre-loaded compliance check pack, encryption-at-rest verification, USB-block status.
- **Rakshak for AI/ML teams** — GPU driver versions, CUDA, free VRAM, model-cache disk usage.
- **Rakshak for Outsourcing / Agencies** — verifies the contractor's machine matches client policy before VPN connect.

### 4. White-label
Sell the engine + UI as a white-label product to MDM / RMM / EDR vendors who lack a developer-facing layer (CrowdStrike, Datto, NinjaOne, etc.).

---

## Competitive landscape

- **Intune / Jamf / Workspace ONE:** admin-side, not developer-facing, no live blocking UX.
- **CCleaner / Glary Utilities:** consumer cleaners, no compliance, no dev-tool awareness.
- **Speccy / HWiNFO:** read-only, no actionability, no policy.
- **CrowdStrike / SentinelOne:** security-only, no productivity insights.
- **Internal IT scripts:** brittle, OS-locked, no UI.

Rakshak sits in a clear gap: **developer experience × IT compliance × actionable UX**.

---

## Go-to-market

1. **OSS launch** on GitHub + HN ("Show HN: Rakshak — an AV scanner for your *productivity*"). Drives top-of-funnel.
2. **Bottom-up adoption:** individual devs install free version → drag IT into upgrading the team to Pro.
3. **Top-down enterprise:** sell to CIO/CISO bundled with compliance reporting.
4. **Channel partners:** MSPs and dev-tool resellers white-label or bundle with developer onboarding kits.

---

## MVP roadmap (already shipped in this repo)

- Cross-platform (Windows + Linux) Electron + React app
- 15+ check modules: CPU, RAM, disk, network quality, network speed, network location/ASN, system updates, Defender, firewall, services, startup apps, Git, Docker, load average, failed services, log errors
- Plugin architecture (`/checks/*.js` auto-discovered)
- Critical Gate (non-scrollable blocking modal) with one-click fixes
- One-click fix actions: open Disk Cleanup, Task Manager, Network Settings, Windows Update, Defender, Firewall, Services
- Tray icon, native low-health notification, auto-launch on login

## Next 30 days (Pro → Enterprise)

- [ ] Central reporting endpoint (HTTPS POST of anonymised health snapshot)
- [ ] Web dashboard for IT (fleet view)
- [ ] Policy YAML (`policy.yml` defining required minimums per check)
- [ ] SSO + RBAC
- [ ] Auto-fix elevation flow (UAC / sudo)
- [ ] macOS support
- [ ] Signed installers + auto-update channel
