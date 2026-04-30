'use strict';

const osLayer = require('../os');

module.exports = {
  id: 'win-defender',
  name: 'Windows Defender',
  category: 'windows',
  platform: 'win32',
  blocking: true,
  fix: { id: 'open-windows-security', label: 'Open Windows Security' },
  async run() {
    const d = await osLayer.getDefenderStatus();
    if (!d.available) {
      return {
        status: 'warning',
        message: 'Windows Defender status could not be read.',
        suggestion: 'Verify a third-party AV is active, or run Get-MpComputerStatus in PowerShell.',
        details: d
      };
    }
    if (!d.antivirusEnabled || !d.realTimeProtection) {
      return {
        status: 'critical',
        message: 'Windows Defender real-time protection is disabled.',
        suggestion: 'Enable real-time protection in Windows Security → Virus & threat protection.',
        details: d
      };
    }
    if (d.signatureAgeDays > 7) {
      return {
        status: 'warning',
        message: `Defender signatures are ${d.signatureAgeDays} days old.`,
        suggestion: 'Run Windows Update or "Update-MpSignature" in PowerShell.',
        details: d
      };
    }
    return {
      status: 'ok',
      message: 'Windows Defender is active and up to date.',
      suggestion: 'No action needed.',
      details: d
    };
  }
};
