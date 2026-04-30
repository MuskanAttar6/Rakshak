import React from 'react';
import './AboutPage.css';

const features = [
  { icon: '🛡️', title: 'Real-Time Health Checks', desc: 'Monitors CPU, RAM, disk, network, services, and more with every scan.' },
  { icon: '📊', title: 'Intelligent Scoring', desc: 'Calculates a system health score with weighted critical and warning checks.' },
  { icon: '💾', title: 'Disk Space Analyzer', desc: 'Visualise every file and folder like TreeSize — find what is eating your drive.' },
  { icon: '🔍', title: 'Duplicate File Finder', desc: 'Scans for identical files by hash and helps you reclaim wasted space.' },
  { icon: '🔴', title: 'Live Monitoring', desc: 'Background watcher alerts you instantly on network drops, USB events, and more.' },
  { icon: '🌐', title: 'gRPC Multi-Node', desc: 'Connect to a central Rakshak server to monitor multiple machines in one view.' },
  { icon: '🌙', title: 'Dark / Light Mode', desc: 'Full theme support — every panel, card, and chart adapts to your preference.' },
  { icon: '📤', title: 'Export Reports', desc: 'Export your health report as JSON or plain text for sharing or logging.' },
];

const techStack = [
  { label: 'Electron', color: '#47848f' },
  { label: 'React', color: '#61dafb' },
  { label: 'Node.js', color: '#3fb950' },
  { label: 'gRPC / Protobuf', color: '#e88a2e' },
  { label: 'Vite', color: '#bd34fe' },
  { label: 'PowerShell', color: '#2671be' },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Hero */}
      <div className="about-hero">
        <div className="about-logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
        </div>
        <div className="about-hero-text">
          <h1>Rakshak</h1>
          <p className="about-tagline">The Performance Guard</p>
          <span className="about-version">v1.0.0</span>
        </div>
      </div>

      <p className="about-description">
        Rakshak is an open, intelligent system health monitor built for developers and power users.
        It gives you deep visibility into your machine's performance, storage, and network —
        with real-time alerts, multi-node support, and a clean interface that stays out of your way.
      </p>

      {/* Features */}
      <section className="about-section">
        <h2 className="about-section-title">Features</h2>
        <div className="about-features-grid">
          {features.map(f => (
            <div key={f.title} className="about-feature-card">
              <span className="about-feature-icon">{f.icon}</span>
              <div>
                <div className="about-feature-title">{f.title}</div>
                <div className="about-feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="about-section">
        <h2 className="about-section-title">Built With</h2>
        <div className="about-tech-row">
          {techStack.map(t => (
            <span key={t.label} className="about-tech-badge" style={{ borderColor: t.color, color: t.color }}>
              {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="about-section">
        <h2 className="about-section-title">How It Works</h2>
        <div className="about-steps">
          {[
            { num: '1', title: 'Scan', desc: 'Click Scan Now — Rakshak runs up to 16 parallel checks across every system layer.' },
            { num: '2', title: 'Score', desc: 'Results are weighted and combined into a single 0–100 health score.' },
            { num: '3', title: 'Act', desc: 'Critical blockers surface immediately. One-click fixes guide you to resolution.' },
            { num: '4', title: 'Monitor', desc: 'Enable Live Monitoring for continuous background watching between scans.' },
          ].map(s => (
            <div key={s.num} className="about-step">
              <div className="about-step-num">{s.num}</div>
              <div>
                <div className="about-step-title">{s.title}</div>
                <div className="about-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="about-footer">
        <span>Built for the Hackathon 2026</span>
        <span className="about-footer-dot">·</span>
        <span>MIT License</span>
        <span className="about-footer-dot">·</span>
        <span>© 2026 Rakshak Contributors</span>
      </div>
    </div>
  );
}
