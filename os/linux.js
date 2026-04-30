'use strict';

const os = require('os');
const { run } = require('./shell');

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
  const { stdout } = await run("df -BG --output=source,size,used,avail,pcent,target / | tail -1");
  // Example: "/dev/sda1      100G   40G   55G  43% /"
  const parts = stdout.split(/\s+/);
  if (parts.length < 6) {
    return { drive: '/', totalGB: 0, usedGB: 0, freeGB: 0, freePercent: 100 };
  }
  const totalGB = parseInt(parts[1], 10) || 0;
  const usedGB = parseInt(parts[2], 10) || 0;
  const freeGB = parseInt(parts[3], 10) || 0;
  return {
    drive: parts[5] || '/',
    totalGB,
    usedGB,
    freeGB,
    freePercent: totalGB > 0 ? +((freeGB / totalGB) * 100).toFixed(1) : 0
  };
}

async function getAllDrives() {
  // Get all real (physical/logical) mounted filesystems, skip pseudo fs
  const { stdout } = await run("df -BG --output=source,size,used,avail,target -x tmpfs -x devtmpfs -x squashfs | tail -n +2");
  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  const drives = lines.map(line => {
    const parts = line.split(/\s+/);
    if (parts.length < 5) return null;
    const totalGB  = parseInt(parts[1], 10) || 0;
    const usedGB   = parseInt(parts[2], 10) || 0;
    const freeGB   = parseInt(parts[3], 10) || 0;
    const mount    = parts[4] || '/';
    const isSystem = mount === '/';
    const usedPct  = totalGB > 0 ? +((usedGB / totalGB) * 100).toFixed(1) : 0;
    const warnPct  = isSystem ? 50 : 70;
    const critPct  = isSystem ? 80 : 90;
    return {
      drive:    mount,
      root:     mount,
      isSystem,
      totalGB,
      usedGB,
      freeGB,
      usedPct,
      freePct:  totalGB > 0 ? +((freeGB / totalGB) * 100).toFixed(1) : 0,
      warnPct,
      critPct,
      status:   usedPct >= critPct ? 'critical' : usedPct >= warnPct ? 'warning' : 'ok'
    };
  }).filter(Boolean);

  if (drives.length === 0) {
    // fallback
    const single = await getDiskSpace();
    const usedPct = single.totalGB > 0 ? +((single.usedGB / single.totalGB) * 100).toFixed(1) : 0;
    return [{
      drive:    single.drive,
      root:     single.drive,
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
  return drives;
}

async function checkInternet() {
  const { code, stdout } = await run('ping -c 2 -W 2 8.8.8.8');
  return { online: code === 0, raw: stdout.split('\n').slice(-3).join(' ').trim() };
}

async function getRunningServices() {
  const { stdout } = await run("systemctl list-units --type=service --state=running --no-legend --no-pager");
  return stdout.split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
}

async function getLoadAverage() {
  const [l1, l5, l15] = os.loadavg();
  const cores = os.cpus().length;
  return { load1: +l1.toFixed(2), load5: +l5.toFixed(2), load15: +l15.toFixed(2), cores };
}

async function getFailedServices() {
  const { stdout } = await run('systemctl --failed --no-legend --no-pager');
  const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(l => l.split(/\s+/)[0]);
}

async function getFirewallStatus() {
  const ufw = await run('ufw status');
  if (ufw.code === 0 && /Status:\s*active/i.test(ufw.stdout)) {
    return { tool: 'ufw', active: true };
  }
  if (ufw.code === 0) return { tool: 'ufw', active: false };

  const ipt = await run('iptables -L -n');
  if (ipt.code === 0) {
    const hasRules = ipt.stdout.split('\n').filter(l => l && !/^Chain|^target/.test(l)).length > 0;
    return { tool: 'iptables', active: hasRules };
  }
  return { tool: 'unknown', active: false };
}

async function getCriticalLogErrors() {
  // Last 200 journal lines at priority err or higher
  const { stdout, code } = await run('journalctl -p err -n 200 --no-pager');
  if (code !== 0) return { available: false, count: 0, samples: [] };
  const lines = stdout.split('\n').filter(Boolean);
  return {
    available: true,
    count: lines.length,
    samples: lines.slice(-3)
  };
}

async function getPendingUpdates() {
  // Try apt first, then dnf
  const apt = await run('bash -lc "command -v apt >/dev/null && apt list --upgradable 2>/dev/null | tail -n +2 | wc -l"');
  if (apt.code === 0 && apt.stdout) {
    const n = parseInt(apt.stdout, 10);
    if (Number.isFinite(n)) return n;
  }
  const dnf = await run('bash -lc "command -v dnf >/dev/null && dnf -q check-update | wc -l"');
  if (dnf.code === 0 && dnf.stdout) {
    const n = parseInt(dnf.stdout, 10);
    if (Number.isFinite(n)) return n;
  }
  return -1;
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
  getAllDrives,
  checkInternet,
  getRunningServices,
  getLoadAverage,
  getFailedServices,
  getFirewallStatus,
  getCriticalLogErrors,
  getPendingUpdates,
  checkGit,
  checkDocker
};
