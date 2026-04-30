import React, { useEffect, useState } from 'react';
import './LiveAlerts.css';
import IntervalSelector from './IntervalSelector.jsx';

export default function LiveAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [monitorStatus, setMonitorStatus] = useState('stopped');
  const [interval, setInterval] = useState(() => {
    // Load from localStorage or default to 6 hours (21600000ms)
    const saved = localStorage.getItem('rakshak-live-interval');
    return saved ? Number(saved) : 21600000; // 6 hours default
  });

  useEffect(() => {
    if (!window.rakshak?.liveMonitor) return;

    // Subscribe to live alerts
    const unsubscribe = window.rakshak.liveMonitor.onAlert((alert) => {
      setAlerts(prev => {
        // Prevent duplicate alerts
        const exists = prev.some(a => a.type === alert.type && a.message === alert.message);
        if (exists) return prev;
        
        // Add new alert at top, keep max 5
        const newAlerts = [{ ...alert, id: Date.now(), dismissed: false }, ...prev].slice(0, 5);
        return newAlerts;
      });
    });

    // Get initial status
    window.rakshak.liveMonitor.getStatus().then(setMonitorStatus);

    return () => unsubscribe && unsubscribe();
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Format interval for display (handles hours, minutes, seconds)
  const formatInterval = (ms) => {
    if (ms >= 3600000) {
      const hours = ms / 3600000;
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    if (ms >= 60000) {
      const mins = ms / 60000;
      return `${mins} min${mins !== 1 ? 's' : ''}`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const handleIntervalChange = async (newInterval) => {
    setInterval(newInterval);
    localStorage.setItem('rakshak-live-interval', newInterval);
    
    // If monitor is running, restart with new interval
    if (monitorStatus.isRunning && window.rakshak?.liveMonitor) {
      await window.rakshak.liveMonitor.stop();
      await window.rakshak.liveMonitor.start({ networkCheckInterval: newInterval });
      const status = await window.rakshak.liveMonitor.getStatus();
      setMonitorStatus(status);
    }
  };

  const toggleMonitor = async () => {
    if (!window.rakshak?.liveMonitor) return;
    
    if (monitorStatus.isRunning) {
      await window.rakshak.liveMonitor.stop();
    } else {
      // Pass interval configuration when starting
      await window.rakshak.liveMonitor.start({ networkCheckInterval: interval });
    }
    
    const status = await window.rakshak.liveMonitor.getStatus();
    setMonitorStatus(status);
  };

  const getAlertIcon = (type) => {
    if (type === 'network-lost') return '🌐';
    if (type === 'network-restored') return '✅';
    if (type === 'usb-connected') return '🔌';
    return '⚠️';
  };

  const getAlertClass = (type) => {
    if (type === 'network-lost') return 'alert-critical';
    if (type === 'usb-connected') return 'alert-warning';
    if (type === 'network-restored') return 'alert-success';
    return 'alert-info';
  };

  return (
    <div className="live-alerts">
      <div className="live-header">
        <h3>🔴 Live Monitoring</h3>
        <button 
          className={`monitor-toggle ${monitorStatus.isRunning ? 'active' : ''}`}
          onClick={toggleMonitor}
        >
          {monitorStatus.isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      <IntervalSelector 
        value={interval} 
        onChange={handleIntervalChange}
        disabled={monitorStatus.isRunning}
      />

      {monitorStatus.isRunning && (
        <div className="monitor-status">
          <span className="status-dot"></span>
          Network: {monitorStatus.network?.online ? 'Online' : 'Offline'}
          <span className="check-interval">
            • Checking every {formatInterval(interval)}
          </span>
          {monitorStatus.usb?.deviceCount > 0 && (
            <span className="usb-count">
              • USB devices: {monitorStatus.usb.deviceCount}
            </span>
          )}
        </div>
      )}

      <div className="alerts-container">
        {alerts.length === 0 && monitorStatus.isRunning && (
          <div className="no-alerts">No alerts - all systems normal</div>
        )}
        
        {alerts.map(alert => (
          <div key={alert.id} className={`alert-card ${getAlertClass(alert.type)}`}>
            <span className="alert-icon">{getAlertIcon(alert.type)}</span>
            <div className="alert-content">
              <div className="alert-message">{alert.message}</div>
              {alert.suggestion && (
                <div className="alert-suggestion">{alert.suggestion}</div>
              )}
              {alert.risk && (
                <div className="alert-risk">⚠️ {alert.risk}</div>
              )}
              <div className="alert-time">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <button className="alert-dismiss" onClick={() => dismissAlert(alert.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
