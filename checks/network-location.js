'use strict';

const osLayer = require('../os');

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
 */
module.exports = {
  id: 'network-location',
  name: 'Network Location',
  category: 'common',
  async run() {
    const g = await osLayer.getPublicGeo();
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
    const expectedAsns = (process.env.RAKSHAK_EXPECTED_ASNS || '').split(',').map(s => s.trim()).filter(Boolean);

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
};
