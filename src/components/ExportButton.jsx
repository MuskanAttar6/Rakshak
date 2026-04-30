import React, { useState } from 'react';

export default function ExportButton({ report }) {
  const [showMenu, setShowMenu] = useState(false);

  if (!report) return null;

  const exportJSON = () => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rakshak-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const exportText = () => {
    const lines = [
      `Rakshak System Health Report`,
      `Generated: ${new Date(report.timestamp).toLocaleString()}`,
      `Platform: ${report.platform}`,
      `Score: ${report.score}/100`,
      ``,
      `Summary:`,
      `- Healthy: ${report.okCount}`,
      `- Need Attention: ${report.warningCount}`,
      `- Critical: ${report.criticalCount}`,
      ``,
      `Detailed Results:`,
      ...report.results.map(r => {
        const status = r.status.toUpperCase();
        return `[${status}] ${r.name}: ${r.message}`;
      })
    ];
    const data = lines.join('\n');
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rakshak-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  return (
    <div className="export-dropdown">
      <button
        className="theme-toggle"
        onClick={() => setShowMenu(!showMenu)}
        title="Export report"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z"/>
        </svg>
      </button>
      {showMenu && (
        <>
          <div className="export-backdrop" onClick={() => setShowMenu(false)} />
          <div className="export-menu">
            <button className="export-option" onClick={exportJSON}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6 4.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm7-7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              </svg>
              Export as JSON
            </button>
            <button className="export-option" onClick={exportText}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5z"/>
                <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
              </svg>
              Export as Text
            </button>
          </div>
        </>
      )}
    </div>
  );
}
