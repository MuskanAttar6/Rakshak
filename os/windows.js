'use strict';

const os = require('os');
const { runPS, run } = require('./shell');

/**
 * Get CPU usage via typeperf (native Windows binary — no PowerShell startup overhead).
 *
 * Uses "% Processor Utility" which matches Task Manager (accounts for frequency scaling).
 * Falls back to "% Processor Time" then Node.js os.cpus() delta.
 *
 * typeperf -sc 2 takes 2 samples 1 second apart and outputs a CSV.
 * We use the SECOND reading so the counter's first-tick baseline error is excluded.
 */
async function getCPUUsage() {
  // typeperf native binary: minimal overhead, no PS startup cost
  const { stdout: out1, code: c1 } = await run(
    'typeperf "\\Processor Information(_Total)\\% Processor Utility" -sc 2',
    { timeout: 5000 }
  );
  if (c1 === 0 && out1) {
    const val = parseTypeperfOutput(out1);
    if (val !== null) return Math.min(100, val);  // cap at 100 for UI
  }

  // Fallback: % Processor Time (always present)
  const { stdout: out2, code: c2 } = await run(
    'typeperf "\\Processor(_Total)\\% Processor Time" -sc 2',
    { timeout: 5000 }
  );
  if (c2 === 0 && out2) {
    const val = parseTypeperfOutput(out2);
    if (val !== null) return Math.min(100, val);
  }

  // Last resort: Node.js os.cpus() delta
  return getCPUUsageNodeJS();
}

/**
 * Parse typeperf CSV output and return the LAST numeric sample value.
 * typeperf output format (two data lines when -sc 2):
 *   "timestamp","value"
 *   "timestamp","value"
 */
function parseTypeperfOutput(raw) {
  const lines = raw.split(/\r?\n/).filter(l => /^\s*"[0-9]/.test(l));
  if (!lines.length) return null;
  // Take the last data line (second sample is more stable)
  const last = lines[lines.length - 1];
  const parts = last.split(',');
  if (parts.length < 2) return null;
  const val = parseFloat(parts[1].replace(/"/g, '').trim());
  return isNaN(val) || val < 0 ? null : +val.toFixed(1);
}

/**
 * Fallback: Node.js os.cpus() delta over 400ms — no external process, but
 * measures Node's own CPU counters so less accurate under load.
 */
async function getCPUUsageNodeJS() {
  const sample = () => {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const c of cpus) {
      for (const t of Object.values(c.times)) total += t;
      idle += c.times.idle;
    }
    return { idle, total };
  };
  const a = sample();
  await new Promise(r => setTimeout(r, 400));
  const b = sample();
  const idleDiff  = b.idle  - a.idle;
  const totalDiff = b.total - a.total;
  return totalDiff === 0 ? 0 : Math.max(0, Math.min(100, +((1 - idleDiff / totalDiff) * 100).toFixed(1)));
}

/**
 * Get detailed CPU info — same typeperf approach as getCPUUsage() but returns
 * a metadata envelope used by the cpu check for reporting.
 */
async function getCPUInfoDetailed() {
  const startTime = Date.now();
  let method = 'typeperf';
  let counterName = '% Processor Utility';
  let usage = -1;

  // Primary: % Processor Utility (matches Task Manager on Win10/11)
  const { stdout: out1, code: c1 } = await run(
    'typeperf "\\Processor Information(_Total)\\% Processor Utility" -sc 2',
    { timeout: 5000 }
  );
  if (c1 === 0 && out1) {
    const val = parseTypeperfOutput(out1);
    if (val !== null) { usage = Math.min(100, val); }  // cap at 100 (turbo boost can exceed)
  }

  // Fallback: % Processor Time
  if (usage === -1) {
    const { stdout: out2, code: c2 } = await run(
      'typeperf "\\Processor(_Total)\\% Processor Time" -sc 2',
      { timeout: 5000 }
    );
    if (c2 === 0 && out2) {
      const val = parseTypeperfOutput(out2);
      if (val !== null) { usage = Math.min(100, val); counterName = '% Processor Time'; }
    }
  }

  // Last resort: Node.js os.cpus() delta
  if (usage === -1 || isNaN(usage)) {
    usage = await getCPUUsageNodeJS();
    method = 'NodeJS';
    counterName = 'os.cpus() calculation';
  }

  return {
    usagePercent: Math.max(0, Math.min(100, usage)),
    method,
    counterName,
    responseTimeMs: Date.now() - startTime,
    timestamp: new Date().toISOString()
  };
}

async function getRAMUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalGB: +(total / 1024 ** 3).toFixed(2),
    usedGB: +(used / 1024 ** 3).toFixed(2),
    freeGB: +(free / 1024 ** 3).toFixed(2),
    percent: +((used / total) * 100).toFixed(1)
  };
}

async function getDiskSpace() {
  // Get system drive (typically C:)
  const sysDrive = (process.env.SystemDrive || 'C:').replace(/\\$/, '');
  const ps = `Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Name -eq '${sysDrive.replace(':', '')}' } | Select-Object Name,@{N='UsedGB';E={[math]::Round($_.Used/1GB,2)}},@{N='FreeGB';E={[math]::Round($_.Free/1GB,2)}} | ConvertTo-Json -Compress`;
  const { stdout } = await runPS(ps);
  try {
    const obj = JSON.parse(stdout);
    const used = obj.UsedGB || 0;
    const free = obj.FreeGB || 0;
    const total = used + free;
    return {
      drive: `${obj.Name}:`,
      totalGB: +total.toFixed(2),
      usedGB: +used.toFixed(2),
      freeGB: +free.toFixed(2),
      freePercent: total > 0 ? +((free / total) * 100).toFixed(1) : 0
    };
  } catch {
    return { drive: sysDrive, totalGB: 0, usedGB: 0, freeGB: 0, freePercent: 100 };
  }
}

async function getAllDrives() {
  const ps = `Get-PSDrive -PSProvider FileSystem | Select-Object Name,@{N='UsedGB';E={[math]::Round($_.Used/1GB,2)}},@{N='FreeGB';E={[math]::Round($_.Free/1GB,2)}},@{N='Root';E={$_.Root}} | ConvertTo-Json -Compress`;
  const { stdout } = await runPS(ps);
  try {
    const raw = JSON.parse(stdout);
    const list = Array.isArray(raw) ? raw : [raw];
    return list
      .filter(d => d.UsedGB != null && d.FreeGB != null)
      .map(d => {
        const used  = d.UsedGB || 0;
        const free  = d.FreeGB || 0;
        const total = used + free;
        const usedPct = total > 0 ? +((used / total) * 100).toFixed(1) : 0;
        // Adaptive thresholds: system drive is stricter
        const isSystem = /^C$/i.test(d.Name);
        const warnPct  = isSystem ? 50 : 70;
        const critPct  = isSystem ? 80 : 90;
        const status = usedPct >= critPct ? 'critical' : usedPct >= warnPct ? 'warning' : 'ok';
        return {
          drive:     `${d.Name}:`,
          root:      d.Root || `${d.Name}:\\`,
          isSystem,
          totalGB:   +total.toFixed(2),
          usedGB:    +used.toFixed(2),
          freeGB:    +free.toFixed(2),
          usedPct,
          freePct:   total > 0 ? +((free / total) * 100).toFixed(1) : 0,
          warnPct,
          critPct,
          status
        };
      });
  } catch {
    // fallback to single-drive getDiskSpace result
    const single = await getDiskSpace();
    const usedPct = +((single.usedGB / (single.totalGB || 1)) * 100).toFixed(1);
    return [{
      drive:    single.drive,
      root:     single.drive + '\\',
      isSystem: true,
      totalGB:  single.totalGB,
      usedGB:   single.usedGB,
      freeGB:   single.freeGB,
      usedPct,
      freePct:  single.freePercent,
      warnPct:  50,
      critPct:  80,
      status:   usedPct >= 80 ? 'critical' : usedPct >= 50 ? 'warning' : 'ok'
    }];
  }
}

async function checkInternet() {
  const { code, stdout } = await run('ping -n 2 8.8.8.8');
  return { online: code === 0, raw: stdout.split('\n').slice(-3).join(' ').trim() };
}

async function getRunningServices() {
  const { stdout } = await runPS(`Get-Service | Where-Object { $_.Status -eq 'Running' } | Select-Object -ExpandProperty Name`);
  return stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

async function getStartupAppCount() {
  const ps = `(Get-CimInstance Win32_StartupCommand | Measure-Object).Count`;
  const { stdout } = await runPS(ps);
  const n = parseInt(stdout, 10);
  return Number.isFinite(n) ? n : 0;
}

async function getDefenderStatus() {
  const ps = `try { $s = Get-MpComputerStatus -ErrorAction Stop; "$($s.AntivirusEnabled)|$($s.RealTimeProtectionEnabled)|$($s.AntivirusSignatureAge)" } catch { 'unavailable' }`;
  const { stdout } = await runPS(ps);
  if (!stdout || stdout === 'unavailable') return { available: false };
  const [av, rtp, age] = stdout.split('|');
  return {
    available: true,
    antivirusEnabled: av === 'True',
    realTimeProtection: rtp === 'True',
    signatureAgeDays: parseInt(age, 10) || 0
  };
}

async function getFirewallStatus() {
  const ps = `Get-NetFirewallProfile | Select-Object Name,Enabled | ConvertTo-Json -Compress`;
  const { stdout } = await runPS(ps);
  try {
    const arr = JSON.parse(stdout);
    const list = Array.isArray(arr) ? arr : [arr];
    const allOn = list.every(p => p.Enabled === true || p.Enabled === 1 || p.Enabled === 'True');
    return { allEnabled: allOn, profiles: list.map(p => ({ name: p.Name, enabled: !!p.Enabled })) };
  } catch {
    return { allEnabled: false, profiles: [] };
  }
}

async function getPendingUpdates() {
  // Lightweight check via Windows Update COM API — may take a moment
  const ps = `try {
    $s = (New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher();
    $r = $s.Search("IsInstalled=0 and Type='Software' and IsHidden=0");
    $r.Updates.Count
  } catch { -1 }`;
  const { stdout } = await runPS(ps);
  const n = parseInt(stdout, 10);
  return Number.isFinite(n) ? n : -1;
}

async function getCriticalServicesStatus() {
  // Critical services that should be running on a healthy Windows dev machine
  const services = ['wuauserv', 'WinDefend', 'MpsSvc', 'Dhcp', 'Dnscache', 'EventLog'];
  const ps = `Get-Service -Name ${services.join(',')} -ErrorAction SilentlyContinue | Select-Object Name,Status | ConvertTo-Json -Compress`;
  const { stdout } = await runPS(ps);
  try {
    const arr = JSON.parse(stdout);
    const list = Array.isArray(arr) ? arr : [arr];
    return list.map(s => ({ name: s.Name, running: String(s.Status) === 'Running' || s.Status === 4 }));
  } catch {
    return [];
  }
}

async function checkGit() {
  const ver = await run('git --version');
  if (ver.code !== 0) return { installed: false, configured: false };
  const name = await run('git config --global user.name');
  const email = await run('git config --global user.email');
  return {
    installed: true,
    version: ver.stdout,
    configured: Boolean(name.stdout && email.stdout),
    userName: name.stdout || null,
    userEmail: email.stdout || null
  };
}

async function checkDocker() {
  const ver = await run('docker --version');
  if (ver.code !== 0) return { installed: false, running: false };
  const info = await run('docker info');
  return { installed: true, version: ver.stdout, running: info.code === 0 };
}

module.exports = {
  getCPUUsage,
  getCPUInfoDetailed,
  getRAMUsage,
  getDiskSpace,
  getAllDrives,
  checkInternet,
  getRunningServices,
  getStartupAppCount,
  getDefenderStatus,
  getFirewallStatus,
  getPendingUpdates,
  getCriticalServicesStatus,
  checkGit,
  checkDocker
};
