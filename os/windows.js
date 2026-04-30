'use strict';

const os = require('os');
const { runPS, run } = require('./shell');

/** Sample CPU usage by measuring idle/total deltas over a short window. */
async function getCPUUsage() {
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
  const idleDiff = b.idle - a.idle;
  const totalDiff = b.total - a.total;
  const usage = totalDiff === 0 ? 0 : (1 - idleDiff / totalDiff) * 100;
  return Math.max(0, Math.min(100, +usage.toFixed(1)));
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
  getRAMUsage,
  getDiskSpace,
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
