'use strict';

const EventEmitter  = require('events');
const grpc          = require('@grpc/grpc-js');
const protoLoader   = require('@grpc/proto-loader');
const config        = require('./config');
const { getNodeIdentity } = require('./node-identity');
const { collectHealth }   = require('./collector');

/**
 * RakshakGrpcClient
 *
 * Maintains a persistent bidirectional gRPC stream with the central server.
 *
 * Events:
 *   'connected'     — { nodeId }
 *   'disconnected'  — { error? }
 *   'report-sent'   — <HealthReport object>
 *   'error'         — Error
 */
class RakshakGrpcClient extends EventEmitter {
  constructor() {
    super();
    this._call            = null;
    this._heartbeatTimer  = null;
    this._reconnectTimer  = null;
    this._reconnectDelay  = 1000;   // starts at 1 s, doubles up to 30 s
    this._stopped         = false;
    this._connected       = false;
    this._stub            = null;
    this._identity        = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  connect() {
    this._stopped = false;
    if (!this._stub) this._init();
    this._openStream();
  }

  disconnect() {
    this._stopped = true;
    this._clearTimers();
    if (this._call) {
      try { this._call.end(); } catch { /* ignore */ }
      this._call = null;
    }
    this._connected = false;
  }

  getStatus() {
    return {
      connected:     this._connected,
      nodeId:        this._identity?.node_id  || null,
      serverAddress: config.serverAddress,
    };
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  _init() {
    const pkgDef = protoLoader.loadSync(config.protoPath, {
      keepCase: true,
      longs:    String,
      enums:    String,
      defaults: true,
      oneofs:   true,
    });
    const pkg = grpc.loadPackageDefinition(pkgDef).rakshak;
    const creds = config.tls
      ? grpc.credentials.createSsl()
      : grpc.credentials.createInsecure();

    this._stub     = new pkg.HealthMonitor(config.serverAddress, creds);
    this._identity = getNodeIdentity();
  }

  _openStream() {
    if (this._stopped) return;

    console.log(`[grpc-client] connecting to ${config.serverAddress}…`);

    const call = this._stub.HealthStream();
    this._call = call;

    call.on('data', (msg) => this._handleMessage(msg));

    call.on('error', (err) => {
      if (this._stopped) return;
      console.warn('[grpc-client] stream error:', err.message);
      this._onDisconnect(err.message);
    });

    call.on('end', () => {
      if (this._stopped) return;
      console.log('[grpc-client] stream ended by server');
      this._onDisconnect('server closed stream');
    });

    // Send NodeHello immediately
    call.write({
      hello: {
        node_id:  this._identity.node_id,
        hostname: this._identity.hostname,
        platform: this._identity.platform,
        arch:     this._identity.arch,
        version:  this._identity.version,
      },
    });

    this._connected      = true;
    this._reconnectDelay = 1000; // reset backoff on successful connect
    this.emit('connected', { nodeId: this._identity.node_id });
    console.log(`[grpc-client] connected — node_id: ${this._identity.node_id}`);

    this._startHeartbeat();
  }

  async _handleMessage(msg) {
    const type = msg.payload;

    if (type === 'request_health') {
      const reqId = msg.request_health?.request_id || '';
      console.log(`[grpc-client] health requested by server (req_id: ${reqId})`);
      try {
        const report = await collectHealth(this._identity.node_id);
        if (this._call && this._connected) {
          this._call.write({ report });
          this.emit('report-sent', report);
          console.log(`[grpc-client] report sent — score: ${report.score}%  cpu: ${report.cpu.usage_percent.toFixed(1)}%  mem: ${report.memory.percent.toFixed(1)}%  disk: ${report.storage.free_percent.toFixed(1)}% free  net: ${report.network.online ? 'online' : 'offline'}`);
        }
      } catch (err) {
        console.error('[grpc-client] collector error:', err.message);
        this.emit('error', err);
      }

    } else if (type === 'ping') {
      // Echo a heartbeat back
      if (this._call && this._connected) {
        this._call.write({
          heartbeat: { node_id: this._identity.node_id, ts: new Date().toISOString() },
        });
      }

    } else if (type === 'ack') {
      console.log(`[grpc-client] server ack: "${msg.ack?.message}"`);
    }
  }

  _startHeartbeat() {
    this._clearTimers();
    this._heartbeatTimer = setInterval(() => {
      if (this._call && this._connected) {
        this._call.write({
          heartbeat: { node_id: this._identity.node_id, ts: new Date().toISOString() },
        });
      }
    }, config.heartbeatIntervalMs);
  }

  _onDisconnect(reason) {
    this._connected = false;
    this._call      = null;
    this.emit('disconnected', { error: reason });
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    this._clearTimers();
    if (this._stopped) return;
    console.log(`[grpc-client] reconnecting in ${this._reconnectDelay / 1000}s…`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectDelay = Math.min(this._reconnectDelay * 2, config.reconnectMaxDelayMs);
      this._openStream();
    }, this._reconnectDelay);
  }

  _clearTimers() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer);  this._heartbeatTimer = null; }
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer);   this._reconnectTimer = null; }
  }
}

module.exports = { RakshakGrpcClient };
