'use strict';

const os = require('os');
const { runPS, run } = require('./shell');

/**
 * Get CPU usage using PDH (Performance Data Helper) via PowerShell
 * Matches Task Manager accuracy - uses % Processor Utility or % Processor Time
 * Based on C++ implementation using GetSystemTimes + PDH counters
 */
async function getCPUUsage() {
  try {
    // Method 1: Try PDH % Processor Utility (most accurate, matches Task Manager)
    // Falls back to % Processor Time if not available
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      
      # Try % Processor Utility first (Windows 10/11, more accurate)
      $cpu = Get-Counter '\Processor Information(_Total)\% Processor Utility' -SampleInterval 1 -MaxSamples 1 -ErrorAction SilentlyContinue
      if ($cpu) {
        $value = [math]::Round($cpu.CounterSamples.CookedValue, 1)
        if ($value -ge 0 -and $value -le 100) { Write-Output $value; exit }
      }
      
      # Fallback to % Processor Time (available on all Windows versions)
      $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
      if ($cpu) {
        $value = [math]::Round($cpu.CounterSamples.CookedValue, 1)
        if ($value -ge 0 -and $value -le 100) { Write-Output $value; exit }
      }
      
      # Last resort: use typeperf
      $typeperf = typeperf '\Processor(_Total)\% Processor Time' -sc 1
      if ($typeperf) {
        $lines = $typeperf -split '\r?\n' | Where-Object { $_ -match '^\s*[0-9]' }
        if ($lines) {
          $parts = $lines[0] -split ','
          if ($parts[1]) {
            $value = [math]::Round([double]($parts[1].Trim('"')), 1)
            if ($value -ge 0 -and $value -le 100) { Write-Output $value; exit }
          }
        }
      }
      
      Write-Output -1
    `;
    
    const { stdout, stderr, code } = await runPS(psScript, { timeout: 3000 });
    
    if (code === 0 && stdout) {
      const value = parseFloat(stdout.trim());
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return Math.max(0, Math.min(100, value));
      }
    }
    
    // If PDH failed, try alternative WMI method
    return await getCPUUsageWMI();
  } catch (err) {
    console.error('[getCPUUsage] PDH method failed:', err.message);
    // Final fallback to WMI
    return await getCPUUsageWMI();
  }
}

/**
 * Fallback: Get CPU using WMI (Win32_PerfFormattedData_PerfOS_Processor)
 * Less accurate but works on all Windows versions
 */
async function getCPUUsageWMI() {
  try {
    const psScript = `
      $cpu = Get-WmiObject -Class Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq '_Total' }
      if ($cpu) {
        [math]::Round($cpu.PercentProcessorTime, 1)
      } else {
        -1
      }
    `;
    
    const { stdout, code } = await runPS(psScript, { timeout: 2000 });
    
    if (code === 0 && stdout) {
      const value = parseFloat(stdout.trim());
      if (!isNaN(value) && value >= 0 && value <= 100) {
        return value;
      }
    }
    
    // Ultimate fallback: Node.js os.cpus()
    return getCPUUsageNodeJS();
  } catch (err) {
    console.error('[getCPUUsageWMI] WMI method failed:', err.message);
    return getCPUUsageNodeJS();
  }
}

/**
 * Ultimate fallback: Node.js native method
 * Least accurate, matches Linux implementation
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
  
  const idleDiff = b.idle - a.idle;
  const totalDiff = b.total - a.total;
  const usage = totalDiff === 0 ? 0 : (1 - idleDiff / totalDiff) * 100;
  
  return Math.max(0, Math.min(100, +usage.toFixed(1)));
}

/**
 * Get detailed CPU info with PDH method tracking
 * Returns usage + metadata about which counter was used
 */
async function getCPUInfoDetailed() {
  const startTime = Date.now();
  let method = 'unknown';
  let counterName = 'N/A';
  let usage = -1;
  
  try {
    // Try PDH % Processor Utility first (Task Manager accurate)
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      
      # Try % Processor Utility first
      $cpu = Get-Counter '\Processor Information(_Total)\% Processor Utility' -SampleInterval 1 -MaxSamples 1 -ErrorAction SilentlyContinue
      if ($cpu) {
        $value = [math]::Round($cpu.CounterSamples.CookedValue, 1)
        if ($value -ge 0 -and $value -le 100) { 
          Write-Output "UTILITY:$value"
          exit 
        }
      }
      
      # Fallback to % Processor Time
      $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
      if ($cpu) {
        $value = [math]::Round($cpu.CounterSamples.CookedValue, 1)
        if ($value -ge 0 -and $value -le 100) { 
          Write-Output "TIME:$value"
          exit 
        }
      }
      
      Write-Output "FAILED:-1"
    `;
    
    const { stdout, code } = await runPS(psScript, { timeout: 3000 });
    
    if (code === 0 && stdout) {
      const output = stdout.trim();
      if (output.startsWith('UTILITY:')) {
        usage = parseFloat(output.split(':')[1]);
        method = 'PDH';
        counterName = '% Processor Utility';
      } else if (output.startsWith('TIME:')) {
        usage = parseFloat(output.split(':')[1]);
        method = 'PDH';
        counterName = '% Processor Time';
      }
    }
    
    // If PDH failed, try WMI
    if (usage === -1) {
      const wmiScript = `
        $cpu = Get-WmiObject -Class Win32_PerfFormattedData_PerfOS_Processor | Where-Object { $_.Name -eq '_Total' }
        if ($cpu) {
          [math]::Round($cpu.PercentProcessorTime, 1)
        } else { -1 }
      `;
      const { stdout: wmiOut } = await runPS(wmiScript, { timeout: 2000 });
      if (wmiOut) {
        usage = parseFloat(wmiOut.trim());
        method = 'WMI';
        counterName = 'Win32_PerfFormattedData_PerfOS_Processor';
      }
    }
    
    // Ultimate fallback
    if (usage === -1 || isNaN(usage)) {
      usage = await getCPUUsageNodeJS();
      method = 'NodeJS';
      counterName = 'os.cpus() calculation';
    }
    
  } catch (err) {
    usage = await getCPUUsageNodeJS();
    method = 'NodeJS';
    counterName = 'os.cpus() calculation (error fallback)';
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
