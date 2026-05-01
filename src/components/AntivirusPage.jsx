import React from 'react';
import './AntivirusPage.css';

export default function AntivirusPage() {
  return (
    <div className="av-page">
      <div className="av-future-card">
        <div className="av-future-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V7l-8-4z" />
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h2 className="av-future-title">Antivirus</h2>
        <p className="av-future-subtitle">Future Extension</p>
        <p className="av-future-desc">
          Antivirus scanning support is planned for a future release.
          This feature will integrate with leading security engines to provide
          real-time threat detection and scheduled scans.
        </p>
        <div className="av-future-features">
          <div className="av-future-feat">
            <span>🛡️</span>
            <span>Real-time malware detection</span>
          </div>
          <div className="av-future-feat">
            <span>🔍</span>
            <span>On-demand file &amp; folder scanning</span>
          </div>
          <div className="av-future-feat">
            <span>🗂️</span>
            <span>Threat quarantine &amp; reporting</span>
          </div>
          <div className="av-future-feat">
            <span>🔄</span>
            <span>Automatic definition updates</span>
          </div>
        </div>
        <div className="av-future-badge">Coming Soon</div>
      </div>
    </div>
  );
}

