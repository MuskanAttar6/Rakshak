'use strict';

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config      = require('./config');

/**
 * RakshakDashboardClient
 *
 * Connects to DashboardService on the central gRPC server.
 * Used by the Electron main process to serve the Remote Nodes UI.
 */
class RakshakDashboardClient {
  constructor() {
    this._stub      = null;
    this._watchCall = null;
  }

  _init() {
    if (this._stub) return;
    const pkgDef = protoLoader.loadSync(config.protoPath, {
      keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
    });
    const pkg   = grpc.loadPackageDefinition(pkgDef).rakshak;
    const creds = config.tls
      ? grpc.credentials.createSsl()
      : grpc.credentials.createInsecure();
    this._stub = new pkg.DashboardService(config.serverAddress, creds);
  }

  // ─── List all connected nodes ─────────────────────────────────────────────
  listNodes() {
    this._init();
    return new Promise((resolve, reject) => {
      this._stub.ListNodes({}, (err, res) => {
        if (err) reject(err);
        else resolve(res.nodes || []);
      });
    });
  }

  // ─── Get full details for one node ────────────────────────────────────────
  getNode(nodeId) {
    this._init();
    return new Promise((resolve, reject) => {
      this._stub.GetNode({ node_id: nodeId }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  // ─── Start a server-streaming watch on one node (or all if nodeId='') ────
  watchNode(nodeId, onUpdate) {
    this._init();
    this.unwatchNode(); // cancel any prior watch
    const call = this._stub.WatchNode({ node_id: nodeId });
    this._watchCall = call;
    call.on('data',  (update) => onUpdate(null, update));
    call.on('error', (err)    => { if (err.code !== grpc.status.CANCELLED) onUpdate(err, null); });
    call.on('end',   ()       => { this._watchCall = null; });
    return call;
  }

  // ─── Cancel active watch ──────────────────────────────────────────────────
  unwatchNode() {
    if (this._watchCall) {
      try { this._watchCall.cancel(); } catch {}
      this._watchCall = null;
    }
  }

  // ─── Request a health scan from a remote node ─────────────────────────────
  triggerScan(nodeId) {
    this._init();
    return new Promise((resolve, reject) => {
      this._stub.TriggerScan({ node_id: nodeId }, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  }

  // ─── Fetch alerts (optionally filtered by nodeId) ─────────────────────────
  listAlerts(nodeId) {
    this._init();
    return new Promise((resolve, reject) => {
      this._stub.ListAlerts({ node_id: nodeId || '' }, (err, res) => {
        if (err) reject(err);
        else resolve(res.alerts || []);
      });
    });
  }
}

module.exports = { RakshakDashboardClient };
