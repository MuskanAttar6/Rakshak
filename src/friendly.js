/**
 * Friendly human-readable labels, icons and categories
 * so the UI never shows technical jargon.
 */

const CHECK_META = {
  cpu: {
    icon: '⚡',
    label: 'Processor',
    group: 'Performance',
    okText: 'Processor is running smoothly',
    warnText: 'Processor is under heavy load',
    critText: 'Processor is overloaded',
  },
  ram: {
    icon: '🧠',
    label: 'Memory',
    group: 'Performance',
    okText: 'Plenty of memory available',
    warnText: 'Memory is getting full',
    critText: 'Almost out of memory',
  },
  disk: {
    icon: '💾',
    label: 'Storage',
    group: 'Performance',
    okText: 'Storage space looks good',
    warnText: 'Running low on storage',
    critText: 'Almost out of storage — free up space now',
  },
  internet: {
    icon: '🌐',
    label: 'Internet',
    group: 'Network',
    okText: 'Connected to the internet',
    warnText: 'Internet connection is weak',
    critText: 'No internet connection',
  },
  'network-quality': {
    icon: '📶',
    label: 'Connection Stability',
    group: 'Network',
    okText: 'Connection is stable and fast',
    warnText: 'Connection is unstable — you may experience slowness',
    critText: 'Connection is very poor — fix before continuing',
  },
  'network-speed': {
    icon: '🚀',
    label: 'Download Speed',
    group: 'Network',
    okText: 'Download speed is good',
    warnText: 'Download speed is slow',
    critText: 'Download speed is too slow to work effectively',
  },
  'network-location': {
    icon: '📍',
    label: 'Network Location',
    group: 'Network',
    okText: 'Connected from expected location',
    warnText: 'Connected from an unusual network',
    critText: 'Connected from outside your organisation',
  },
  updates: {
    icon: '🔄',
    label: 'System Updates',
    group: 'Security',
    okText: 'System is up to date',
    warnText: 'Some updates available',
    critText: 'Many updates pending — update soon',
  },
  git: {
    icon: '🔀',
    label: 'Git',
    group: 'Developer Tools',
    okText: 'Git is set up and ready',
    warnText: 'Git needs configuration',
    critText: 'Git is not installed',
  },
  docker: {
    icon: '🐳',
    label: 'Docker',
    group: 'Developer Tools',
    okText: 'Docker is running',
    warnText: 'Docker is not running',
    critText: 'Docker is not installed',
  },
  'win-startup-apps': {
    icon: '🏁',
    label: 'Startup Apps',
    group: 'Performance',
    okText: 'Startup apps are manageable',
    warnText: 'Too many apps launch at startup',
    critText: 'Way too many startup apps — slowing boot',
  },
  'win-defender': {
    icon: '🛡️',
    label: 'Antivirus',
    group: 'Security',
    okText: 'Antivirus is active and updated',
    warnText: 'Antivirus needs attention',
    critText: 'Antivirus protection is off',
  },
  'win-firewall': {
    icon: '🧱',
    label: 'Firewall',
    group: 'Security',
    okText: 'Firewall is active',
    warnText: 'Some firewall profiles disabled',
    critText: 'Firewall is turned off',
  },
  'win-critical-services': {
    icon: '⚙️',
    label: 'Essential Services',
    group: 'Security',
    okText: 'All essential services running',
    warnText: 'Some essential services need attention',
    critText: 'Essential services are stopped',
  },
  'linux-load-average': {
    icon: '📊',
    label: 'System Load',
    group: 'Performance',
    okText: 'System load is normal',
    warnText: 'System load is elevated',
    critText: 'System load is very high',
  },
  'linux-failed-services': {
    icon: '⚙️',
    label: 'System Services',
    group: 'Security',
    okText: 'All services running normally',
    warnText: 'Some services have failed',
    critText: 'Multiple services have failed',
  },
  'linux-firewall': {
    icon: '🧱',
    label: 'Firewall',
    group: 'Security',
    okText: 'Firewall is active',
    warnText: 'Firewall appears inactive',
    critText: 'No firewall protection detected',
  },
  'linux-log-errors': {
    icon: '📋',
    label: 'System Logs',
    group: 'Security',
    okText: 'No significant errors in logs',
    warnText: 'Some errors found in system logs',
    critText: 'Many errors in system logs',
  },
  duplicates: {
    icon: '🗂️',
    label: 'Duplicate Files',
    group: 'Storage',
    okText: 'No duplicate files found',
    warnText: 'Duplicate files detected — wasting disk space',
    critText: 'Many duplicates found — review and clean up',
  },
};

const FALLBACK = {
  icon: '🔍',
  label: 'System Check',
  group: 'Other',
  okText: 'Looking good',
  warnText: 'Needs attention',
  critText: 'Needs immediate action',
};

export function getMeta(checkId) {
  return CHECK_META[checkId] || { ...FALLBACK, label: checkId };
}

export function getFriendlyStatus(status) {
  if (status === 'ok') return { label: 'All Good', color: 'ok' };
  if (status === 'warning') return { label: 'Needs Attention', color: 'warn' };
  return { label: 'Fix This Now', color: 'crit' };
}

export function getFriendlyMessage(checkId, status) {
  const m = getMeta(checkId);
  if (status === 'ok') return m.okText;
  if (status === 'warning') return m.warnText;
  return m.critText;
}

export function getScoreLabel(score) {
  if (score >= 90) return { text: 'Excellent', emoji: '🎉' };
  if (score >= 75) return { text: 'Good', emoji: '👍' };
  if (score >= 60) return { text: 'Fair', emoji: '⚠️' };
  if (score >= 40) return { text: 'Poor', emoji: '😟' };
  return { text: 'Critical', emoji: '🚨' };
}

const GROUP_ORDER = ['Network', 'Performance', 'Security', 'Storage', 'Developer Tools', 'Other'];

export function groupResults(results) {
  const groups = {};
  for (const r of results) {
    const m = getMeta(r.id);
    const g = m.group;
    if (!groups[g]) groups[g] = [];
    groups[g].push(r);
  }
  return GROUP_ORDER.filter(g => groups[g]).map(g => ({ group: g, items: groups[g] }));
}

const GROUP_ICONS = {
  Network: '🌐',
  Performance: '⚡',
  Security: '🔒',
  Storage: '💿',
  'Developer Tools': '🛠️',
  Other: '🔍',
};

export function getGroupIcon(group) {
  return GROUP_ICONS[group] || '🔍';
}
