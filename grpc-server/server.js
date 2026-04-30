'use strict';

/**
 * Rakshak Central Health Monitor — gRPC Server + Web UI
 *
 * gRPC :50051   — bidirectional HealthStream from Rakshak nodes
 * HTTP :3001    — Web UI (login -> nodes list -> node dashboard)
 *
 * Env vars:
 *   GRPC_PORT         — gRPC port         (default: 50051)
 *   HTTP_PORT         — HTTP port         (default: 3001)
 *   POLL_INTERVAL_MS  — Auto-poll (ms)    (default: 60000)
 */

const path   = require('path');
const http   = require('http');
const crypto = require('crypto');
const urlMod = require('url');
const grpc   = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const auth   = require('./auth');
const alerts = require('./alerts');

const loginView     = require('./views/login');
const nodesView     = require('./views/nodes');
const dashboardView = require('./views/dashboard');

const PROTO_PATH       = path.join(__dirname, 'proto', 'health.proto');
const GRPC_PORT        = process.env.GRPC_PORT        || '50051';
const HTTP_PORT        = parseInt(process.env.HTTP_PORT || '3001', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);
const MAX_HISTORY      = 20;

const nodes = new Map();

function loadProto() {
  const pkgDef = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  return grpc.loadPackageDefinition(pkgDef).rakshak;
}

function healthStream(call) {
  let nodeId = null;

  call.on('data', (msg) => {
    const type = msg.payload;

    if (type === 'hello') {
      const hello = msg.hello;
      nodeId = hello.node_id;
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, { info: hello, lastReport: null, lastHeartbeat: new Date().toISOString(), connected: true, call, history: [] });
      } else {
        const n = nodes.get(nodeId);
        n.info = hello; n.connected = true; n.call = call;
        n.lastHeartbeat = new Date().toISOString();
      }
      console.log('[server] node connected: ' + hello.hostname + ' (' + nodeId.slice(0, 8) + '... | ' + hello.platform + '/' + hello.arch + ')');
      call.write({ ack: { message: 'Welcome, ' + hello.hostname + '!', request_id: '' } });
      call.write({ request_health: { request_id: crypto.randomBytes(8).toString('hex') } });
      return;
    }

    if (type === 'report') {
      const r = msg.report;
      if (!nodeId) return;
      const node = nodes.get(nodeId);
      if (!node) return;
      node.lastReport = Object.assign({}, r, { receivedAt: new Date().toISOString() });
      node.history.push({
        ts:       new Date().toISOString(),
        cpu:      r.cpu && r.cpu.usage_percent      != null ? r.cpu.usage_percent      : 0,
        mem:      r.memory && r.memory.percent      != null ? r.memory.percent         : 0,
        storUsed: r.storage ? +(100 - (r.storage.free_percent || 0)).toFixed(1)        : 0,
        latency:  r.network && r.network.avg_latency != null ? r.network.avg_latency   : 0,
      });
      if (node.history.length > MAX_HISTORY) node.history.shift();
      alerts.fromReport(r, node.info.hostname);
      const cpu  = ((r.cpu && r.cpu.usage_percent)    || 0).toFixed(1);
      const mem  = ((r.memory && r.memory.percent)    || 0).toFixed(1);
      const disk = ((r.storage && r.storage.free_percent) || 0).toFixed(1);
      const net  = (r.network && r.network.online) ? 'online' : 'OFFLINE';
      console.log('[server] report  ' + node.info.hostname + ' score=' + r.score + '% cpu=' + cpu + '% mem=' + mem + '% disk=' + disk + '%free net=' + net);
      call.write({ ack: { message: 'Report received.', request_id: '' } });
      return;
    }

    if (type === 'heartbeat') {
      if (nodeId && nodes.has(nodeId)) {
        nodes.get(nodeId).lastHeartbeat = new Date().toISOString();
      }
    }
  });

  call.on('error', (err) => {
    if (nodeId && nodes.has(nodeId)) {
      nodes.get(nodeId).connected = false;
      nodes.get(nodeId).call = null;
      console.log('[server] node disconnected (error): ' + nodeId.slice(0, 8) + '... — ' + err.message);
    }
  });

  call.on('end', () => {
    if (nodeId && nodes.has(nodeId)) {
      nodes.get(nodeId).connected = false;
      nodes.get(nodeId).call = null;
      console.log('[server] node disconnected (end): ' + nodeId.slice(0, 8) + '...');
    }
    try { call.end(); } catch (_) {}
  });
}

function startPolling() {
  setInterval(() => {
    let polled = 0;
    for (const id of nodes.keys()) {
      const node = nodes.get(id);
      if (!node.connected || !node.call) continue;
      try {
        node.call.write({ request_health: { request_id: crypto.randomBytes(8).toString('hex') } });
        polled++;
      } catch (err) {
        console.warn('[server] poll failed for ' + id.slice(0, 8) + '...:', err.message);
        node.connected = false; node.call = null;
      }
    }
    if (polled > 0) console.log('[server] polled ' + polled + ' node(s)');
  }, POLL_INTERVAL_MS);
}

function send(res, status, body, ct) {
  res.writeHead(status, { 'Content-Type': ct || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj, null, 2), 'application/json');
}
function redirect(res, loc) {
  res.writeHead(302, { Location: loc });
  res.end();
}
function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        const params = new URLSearchParams(body);
        const obj = {};
        for (const [k, v] of params) obj[k] = v;
        resolve(obj);
      } catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}
function nodeToJson(id, node) {
  return { node_id: id, info: node.info, lastReport: node.lastReport, lastHeartbeat: node.lastHeartbeat, connected: node.connected, history: node.history };
}

function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    const parsed   = urlMod.parse(req.url || '/', true);
    const pathname = parsed.pathname;
    const query    = parsed.query;
    const method   = req.method || 'GET';

    if (method === 'GET' && pathname === '/') {
      if (auth.sessionFromReq(req)) { redirect(res, '/nodes'); return; }
      send(res, 200, loginView.render());
      return;
    }

    if (method === 'POST' && pathname === '/auth/login') {
      const body  = await parseBody(req);
      const token = auth.login(body.employeeId || '');
      if (!token) {
        send(res, 200, loginView.render({ error: 'Invalid Employee ID. Please try again.' }));
        return;
      }
      res.writeHead(302, {
        Location: '/nodes',
        'Set-Cookie': 'session=' + token + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800',
      });
      res.end();
      return;
    }

    if ((method === 'GET' || method === 'POST') && pathname === '/auth/logout') {
      const cookies = auth.parseCookies(req.headers.cookie);
      if (cookies.session) auth.destroy(cookies.session);
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      });
      res.end();
      return;
    }

    if (!auth.requireAuth(req, res)) return;

    if (method === 'GET' && pathname === '/nodes') {
      send(res, 200, nodesView.render());
      return;
    }

    const nodePageMatch = pathname.match(/^\/node\/([^/]+)$/);
    if (method === 'GET' && nodePageMatch) {
      const id = decodeURIComponent(nodePageMatch[1]);
      send(res, 200, dashboardView.render(id));
      return;
    }

    if (method === 'GET' && pathname === '/api/nodes') {
      const list = [];
      for (const [id, n] of nodes) list.push(nodeToJson(id, n));
      sendJson(res, 200, list);
      return;
    }

    const apiNodeMatch = pathname.match(/^\/api\/nodes\/([^/]+)$/);
    if (method === 'GET' && apiNodeMatch) {
      const id   = decodeURIComponent(apiNodeMatch[1]);
      const node = nodes.get(id);
      if (!node) { sendJson(res, 404, { error: 'node not found' }); return; }
      sendJson(res, 200, nodeToJson(id, node));
      return;
    }

    const scanMatch = pathname.match(/^\/api\/nodes\/([^/]+)\/scan$/);
    if (method === 'POST' && scanMatch) {
      const id   = decodeURIComponent(scanMatch[1]);
      const node = nodes.get(id);
      if (!node) { sendJson(res, 404, { error: 'node not found' }); return; }
      if (!node.connected || !node.call) { sendJson(res, 409, { error: 'node is disconnected' }); return; }
      const reqId = crypto.randomBytes(8).toString('hex');
      try {
        node.call.write({ request_health: { request_id: reqId } });
        console.log('[server] manual scan -> ' + id.slice(0, 8) + '... (req: ' + reqId + ')');
        sendJson(res, 200, { ok: true, request_id: reqId });
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
      return;
    }

    if (method === 'GET' && pathname === '/api/alerts') {
      const nodeId = query.nodeId || null;
      sendJson(res, 200, alerts.get(nodeId || undefined));
      return;
    }

    send(res, 404, '<p style="font-family:sans-serif;color:#94a3b8;padding:40px">404 Not Found</p>');
  });

  server.listen(HTTP_PORT, () => {
    console.log('[server] HTTP Web UI   -> http://localhost:' + HTTP_PORT);
    console.log('[server] Login with Employee ID: EMP001');
  });
}

const proto      = loadProto();
const grpcServer = new grpc.Server();
grpcServer.addService(proto.HealthMonitor.service, { HealthStream: healthStream });

grpcServer.bindAsync(
  '0.0.0.0:' + GRPC_PORT,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) { console.error('[server] gRPC bind failed:', err); process.exit(1); }
    console.log('[server] gRPC listening  -> port ' + port);
    startPolling();
    startHttpServer();
    console.log('[server] ready — waiting for Rakshak nodes to connect');
  }
);
