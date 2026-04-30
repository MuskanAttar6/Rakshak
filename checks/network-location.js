'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_FILE = path.join(os.tmpdir(), 'rakshak-geo-cache.json');
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Read cached geo data if fresh
 * @returns {object|null}
 */
function readCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() - data.timestamp < CACHE_TTL_MS) {
      return data.geo;
    }
  } catch {
    // Cache miss or corrupted - silent fail
  }
  return null;
}

/**
 * Write geo data to cache
 * @param {object} geo
 */
function writeCache(geo) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), geo }));
  } catch {
    // Write failed - silent fail (don't break check)
  }
}

/**
 * Get public geo with caching and fallback
 * @param {object} osLayer - OS abstraction layer (injected for testing)
 * @returns {Promise<object>}
 */
async function getGeoWithCache(osLayer) {
  const cached = readCache();
  if (cached) {
    return cached;
  }

  const result = await osLayer.getPublicGeo();
  if (result.ok) {
    writeCache(result);
  }
  return result;
}

/**
 * Parse ASN list from env var safely
 * Only accepts valid ASN format: AS followed by 4-10 digits
 * @param {string} envValue
 * @returns {string[]}
 */
function parseAsnList(envValue) {
  if (!envValue || typeof envValue !== 'string') {
    return [];
  }
  // ASN format: AS12345 (AS prefix + 4-10 digits, word boundaries)
  const asnPattern = /\bAS\d{4,10}\b/gi;
  const matches = envValue.match(asnPattern) || [];
  // Remove duplicates and normalize case
  return [...new Set(matches.map(m => m.toUpperCase()))];
}

/**
 * Detects the user's public-IP location and ISP.
 * In an enterprise context, this is useful to flag:
 *  - Working over a non-corp network without VPN
 *  - Travelling outside the expected country
 *  - Connected via a residential ISP when corp policy expects VPN
 *
 * To enforce a policy, set environment variables:
 *   RAKSHAK_EXPECTED_COUNTRY=India
 *   RAKSHAK_EXPECTED_ASNS=AS12345,AS67890
 *
 * @param {object} deps - Dependencies { osLayer } for testing
 */
async function run(deps = {}) {
  // Allow dependency injection for testing
  const { osLayer: injectedOsLayer } = deps;
  const osLayer = injectedOsLayer || require('../os');

  const g = await getGeoWithCache(osLayer);
  const base = { details: g };
  if (!g.ok) {
    return {
      status: 'warning',
      message: 'Could not determine public IP / location.',
      suggestion: 'Check internet connectivity. Some corp proxies block ipapi.co.',
      ...base
    };
  }
  const expectedCountry = process.env.RAKSHAK_EXPECTED_COUNTRY;
  const expectedAsns = parseAsnList(process.env.RAKSHAK_EXPECTED_ASNS);

  if (expectedCountry && g.country && expectedCountry.toLowerCase() !== g.country.toLowerCase()) {
    return {
      status: 'warning',
      message: `You are connected from ${g.country} (${g.city}) — expected ${expectedCountry}.`,
      suggestion: 'Connect to corporate VPN if you need access to internal resources.',
      ...base
    };
  }
  if (expectedAsns.length && g.asn && !expectedAsns.includes(g.asn)) {
    return {
      status: 'warning',
      message: `On non-approved network: ${g.org || g.asn}.`,
      suggestion: 'Connect to corporate VPN or join an approved network.',
      ...base
    };
  }
  return {
    status: 'ok',
    message: `Network location: ${g.city || '—'}, ${g.country || '—'} (${g.org || g.asn || 'ISP'}).`,
    suggestion: 'No action needed.',
    ...base
  };
}

module.exports = {
  id: 'network-location',
  name: 'Network Location',
  category: 'common',
  run,
  // Export internals for testing
  _internals: { readCache, writeCache, getGeoWithCache, parseAsnList }
};
