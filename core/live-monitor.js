'use strict';

/**
 * Live System Monitor
 * - Event-driven USB detection (no polling)
 * - Adaptive network monitoring (low CPU)
 * - Throttled alerts (no spam)
 */

const { EventEmitter } = require('events');
const os = require('os');
const { exec } = require('child_process');

class LiveMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      networkCheckInterval: 2000,      // 2 seconds when stable
      networkFastInterval: 500,        // 500ms when issues detected
      alertCooldown: 30000,            // 30 seconds between same alerts
      usbMonitoring: true,
      networkMonitoring: true,
      ...options
    };
    
    this.state = {
      network: { online: true, lastCheck: 0 },
      usb: { devices: new Set() },
      alerts: new Map()                 // Track last alert time
    };
    
    this.timers = new Map();
    this.isRunning = false;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[LiveMonitor] Starting...');
    
    if (this.config.networkMonitoring) {
      this._startNetworkMonitoring();
    }
    
    if (this.config.usbMonitoring) {
      this._startUSBMonitoring();
    }
  }

  /**
   * Stop all monitoring
   */
  stop() {
    this.isRunning = false;
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    console.log('[LiveMonitor] Stopped');
  }

  /**
   * Network monitoring with adaptive intervals
   * Uses OS native interface state + light ping backup
   */
  _startNetworkMonitoring() {
    let checkInterval = this.config.networkCheckInterval;
    let consecutiveFailures = 0;
    
    const checkNetwork = async () => {
      try {
        // Method 1: Check OS network interface state (instant, no CPU)
        const interfaces = os.networkInterfaces();
        const hasActiveInterface = Object.values(interfaces)
          .flat()
          .some(iface => !iface.internal && iface.family === 'IPv4' && !iface.address.startsWith('169.254'));
        
        // Method 2: Quick DNS resolve (lighter than ping)
        const online = hasActiveInterface && await this._quickConnectivityCheck();
        
        const previousState = this.state.network.online;
        this.state.network.online = online;
        this.state.network.lastCheck = Date.now();
        
        // Adaptive interval: faster when issues detected
        if (!online) {
          consecutiveFailures++;
          if (consecutiveFailures >= 2) {
            // Switch to fast polling when disconnected
            if (checkInterval !== this.config.networkFastInterval) {
              checkInterval = this.config.networkFastInterval;
              this._resetNetworkTimer(checkNetwork, checkInterval);
            }
            
            // Emit alert with throttling
            this._emitAlert('network-lost', {
              message: 'Internet connection lost',
              timestamp: Date.now(),
              suggestion: 'Check WiFi/Ethernet connection'
            });
          }
        } else {
          // Back to normal when restored
          if (consecutiveFailures > 0) {
            this._emitAlert('network-restored', {
              message: 'Internet connection restored',
              timestamp: Date.now()
            });
            consecutiveFailures = 0;
            checkInterval = this.config.networkCheckInterval;
            this._resetNetworkTimer(checkNetwork, checkInterval);
          }
        }
        
        this.emit('network-status', { online, interfaces: hasActiveInterface });
      } catch (err) {
        console.error('[LiveMonitor] Network check error:', err.message);
      }
    };
    
    // Initial check
    checkNetwork();
    
    // Set up interval (will be dynamically adjusted)
    this._resetNetworkTimer(checkNetwork, checkInterval);
  }

  /**
   * Quick connectivity check using DNS (faster than ping)
   */
  _quickConnectivityCheck() {
    return new Promise((resolve) => {
      // Use Node's built-in DNS (lightweight, no external process)
      const dns = require('dns');
      dns.resolve('google.com', (err) => {
        resolve(!err);
      });
      
      // Timeout after 1 second
      setTimeout(() => resolve(false), 1000);
    });
  }

  _resetNetworkTimer(fn, interval) {
    if (this.timers.has('network')) {
      clearInterval(this.timers.get('network'));
    }
    const timer = setInterval(fn, interval);
    timer.unref(); // Don't block process exit
    this.timers.set('network', timer);
    console.log(`[LiveMonitor] Network check interval: ${interval}ms`);
  }

  /**
   * USB monitoring using OS-native event APIs (no polling!)
   * Windows: WMI events via PowerShell
   * Linux: udev via child process
   */
  _startUSBMonitoring() {
    if (process.platform === 'win32') {
      this._startWindowsUSBMonitoring();
    } else if (process.platform === 'linux') {
      this._startLinuxUSBMonitoring();
    }
  }

  /**
   * Windows USB monitoring using WMI events
   * Zero CPU usage - event driven via PowerShell
   */
  _startWindowsUSBMonitoring() {
    const psScript = `
      $Query = "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_PnPEntity' AND TargetInstance.Name LIKE '%USB%'"
      Register-WmiEvent -Query $Query -Action {
        Write-Host "USB_CONNECTED:$($Event.SourceEventArgs.NewEvent.TargetInstance.DeviceID)"
      }
      
      $RemoveQuery = "SELECT * FROM __InstanceDeletionEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_PnPEntity' AND TargetInstance.Name LIKE '%USB%'"
      Register-WmiEvent -Query $RemoveQuery -Action {
        Write-Host "USB_DISCONNECTED:$($Event.SourceEventArgs.NewEvent.TargetInstance.DeviceID)"
      }
      
      # Keep alive
      while ($true) { Start-Sleep -Seconds 10 }
    `;
    
    const child = exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`, {
      windowsHide: true
    });
    
    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      
      if (line.startsWith('USB_CONNECTED:')) {
        const deviceId = line.split(':')[1];
        this._handleUSBConnect(deviceId);
      } else if (line.startsWith('USB_DISCONNECTED:')) {
        const deviceId = line.split(':')[1];
        this._handleUSBDisconnect(deviceId);
      }
    });
    
    child.stderr.on('data', (err) => {
      console.error('[LiveMonitor] USB monitor error:', err.toString());
    });
    
    child.on('exit', (code) => {
      if (this.isRunning) {
        console.log('[LiveMonitor] USB monitor restarted');
        setTimeout(() => this._startWindowsUSBMonitoring(), 5000);
      }
    });
    
    this.timers.set('usb', child);
  }

  /**
   * Linux USB monitoring using udevadm
   * Zero CPU usage - event driven
   */
  _startLinuxUSBMonitoring() {
    // Monitor udev events for USB add/remove
    const child = exec('udevadm monitor --udev --subsystem-match=usb', {
      windowsHide: true
    });
    
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      
      for (const line of lines) {
        if (line.includes('add') && line.includes('usb')) {
          // Extract device info if available
          this._handleUSBConnect('unknown-device');
        } else if (line.includes('remove') && line.includes('usb')) {
          this._handleUSBDisconnect('unknown-device');
        }
      }
    });
    
    child.on('exit', () => {
      if (this.isRunning) {
        setTimeout(() => this._startLinuxUSBMonitoring(), 5000);
      }
    });
    
    this.timers.set('usb', child);
  }

  _handleUSBConnect(deviceId) {
    if (this.state.usb.devices.has(deviceId)) return;
    
    this.state.usb.devices.add(deviceId);
    
    this._emitAlert('usb-connected', {
      message: 'USB device connected to your system',
      deviceId,
      timestamp: Date.now(),
      risk: 'Review if you authorized this device'
    });
    
    this.emit('usb-connect', { deviceId });
  }

  _handleUSBDisconnect(deviceId) {
    this.state.usb.devices.delete(deviceId);
    this.emit('usb-disconnect', { deviceId });
  }

  /**
   * Throttled alert emission - prevents spam
   */
  _emitAlert(type, data) {
    const now = Date.now();
    const lastAlert = this.state.alerts.get(type);
    
    // Throttle same alert type
    if (lastAlert && (now - lastAlert) < this.config.alertCooldown) {
      return;
    }
    
    this.state.alerts.set(type, now);
    this.emit('alert', { type, ...data });
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      network: { ...this.state.network },
      usb: { deviceCount: this.state.usb.devices.size },
      isRunning: this.isRunning
    };
  }
}

module.exports = { LiveMonitor };
