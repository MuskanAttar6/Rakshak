'use strict';

/**
 * Cross-platform network insight helpers.
 * - Latency + packet loss to multiple targets
 * - Approx download speed (small file, time-bounded)
 * - Public IP + geolocation (used to detect "out of network" / VPN issues)
 */

const https = require('https');
const http = require('http');
const { run } = require('./shell');

const PING_TARGETS = ['8.8.8.8', '1.1.1.1'];

function pingCommand(host) {
  return process.platform === 'win32'
    ? `ping -n 4 ${host}`
    : `ping -c 4 -W 2 ${host}`;
}

function parsePing(out) {
  const text = out || '';
  // average latency
  let avg = null;
  const winAvg = text.match(/Average\s*=\s*(\d+)ms/i);
  if (winAvg) avg = parseFloat(winAvg[1]);
  if (avg == null) {
    const linAvg = text.match(/=\s*[\d.]+\/([\d.]+)\/[\d.]+\/[\d.]+\s*ms/);
    if (linAvg) avg = parseFloat(linAvg[1]);
  }
  // packet loss %
  let loss = null;
  const lossMatch = text.match(/(\d+)%\s*loss/i) || text.match(/Lost\s*=\s*\d+\s*\((\d+)%/i);
  if (lossMatch) loss = parseInt(lossMatch[1], 10);
  return { avgMs: avg, lossPercent: loss };
}

async function getNetworkQuality() {
  const results = await Promise.all(
    PING_TARGETS.map(async (h) => {
      const { stdout, code } = await run(pingCommand(h));
      const parsed = parsePing(stdout);
      return { host: h, reachable: code === 0, ...parsed };
    })
  );
  const reachable = results.filter(r => r.reachable && r.avgMs != null);
  const avgLatency = reachable.length
    ? +(reachable.reduce((s, r) => s + r.avgMs, 0) / reachable.length).toFixed(1)
    : null;
  const avgLoss = results.length
    ? Math.round(results.reduce((s, r) => s + (r.lossPercent ?? 100), 0) / results.length)
    : 100;
  return { targets: results, avgLatency, avgLoss, online: reachable.length > 0 };
}

/** Lightweight HTTP-based bandwidth probe. Downloads ~5MB, capped at 6s. */
function downloadSpeedTest(timeoutMs = 6000) {
  return new Promise((resolve) => {
    const url = 'https://speed.cloudflare.com/__down?bytes=5000000';
    const start = Date.now();
    let bytes = 0;
    let timer;
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const elapsed = (Date.now() - start) / 1000;
      const mbps = elapsed > 0 ? +((bytes * 8) / (1_000_000 * elapsed)).toFixed(2) : 0;
      resolve({ ok: !err && bytes > 0, bytes, elapsedSec: +elapsed.toFixed(2), mbps, error: err ? err.message : null });
    };

    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        finish(new Error('HTTP ' + res.statusCode));
        return;
      }
      res.on('data', (chunk) => { bytes += chunk.length; });
      res.on('end', () => finish());
      res.on('error', finish);
    });
    req.on('error', finish);
    timer = setTimeout(() => { try { req.destroy(); } catch {} finish(); }, timeoutMs);
  });
}

/** Public IP + geo info — used to detect VPN / out-of-corp-network situations. */
function getPublicGeo(timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = https.get('https://ipapi.co/json/', (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve({
            ok: true,
            ip: j.ip,
            city: j.city,
            region: j.region,
            country: j.country_name,
            org: j.org,
            asn: j.asn
          });
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
      res.on('error', (e) => resolve({ ok: false, error: e.message }));
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(timeoutMs, () => { try { req.destroy(); } catch {} resolve({ ok: false, error: 'timeout' }); });
  });
}

module.exports = { getNetworkQuality, downloadSpeedTest, getPublicGeo };
