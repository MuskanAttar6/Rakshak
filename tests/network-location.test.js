'use strict';

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const networkLocation = require('../checks/network-location');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { readCache, writeCache, getGeoWithCache, parseAsnList } = networkLocation._internals;
const CACHE_FILE = path.join(os.tmpdir(), 'rakshak-geo-cache.json');

describe('network-location check', () => {
  // Clean up cache before each test
  beforeEach(() => {
    try { fs.unlinkSync(CACHE_FILE); } catch {}
    delete process.env.RAKSHAK_EXPECTED_COUNTRY;
    delete process.env.RAKSHAK_EXPECTED_ASNS;
  });

  afterEach(() => {
    try { fs.unlinkSync(CACHE_FILE); } catch {}
    delete process.env.RAKSHAK_EXPECTED_COUNTRY;
    delete process.env.RAKSHAK_EXPECTED_ASNS;
  });

  describe('parseAsnList', () => {
    test('returns empty array for undefined', () => {
      expect(parseAsnList(undefined)).toEqual([]);
    });

    test('returns empty array for empty string', () => {
      expect(parseAsnList('')).toEqual([]);
    });

    test('parses single ASN', () => {
      expect(parseAsnList('AS12345')).toEqual(['AS12345']);
    });

    test('parses multiple ASNs', () => {
      expect(parseAsnList('AS12345,AS67890')).toEqual(['AS12345', 'AS67890']);
    });

    test('extracts valid ASNs from malicious input', () => {
      // Extracts only valid ASN patterns, ignoring malicious commands
      expect(parseAsnList('AS12345;rm -rf /')).toEqual(['AS12345']);
      expect(parseAsnList('AS12345|cat /etc/passwd')).toEqual(['AS12345']);
      expect(parseAsnList('AS12345`whoami`')).toEqual(['AS12345']);
      expect(parseAsnList('AS12345$(rm -rf /)')).toEqual(['AS12345']);
    });

    test('handles ASN with spaces', () => {
      expect(parseAsnList('AS12345, AS67890')).toEqual(['AS12345', 'AS67890']);
    });

    test('normalizes to uppercase', () => {
      expect(parseAsnList('as12345,As67890')).toEqual(['AS12345', 'AS67890']);
    });

    test('removes duplicate ASNs', () => {
      expect(parseAsnList('AS12345,AS12345,AS67890')).toEqual(['AS12345', 'AS67890']);
    });

    test('rejects invalid ASN formats', () => {
      // Too few digits
      expect(parseAsnList('AS123')).toEqual([]);
      // Too many digits
      expect(parseAsnList('AS12345678901')).toEqual([]);
      // Missing AS prefix
      expect(parseAsnList('12345')).toEqual([]);
    });
  });

  describe('readCache / writeCache', () => {
    test('read returns null when no cache', () => {
      expect(readCache()).toBeNull();
    });

    test('write and read roundtrip', () => {
      const geo = { ok: true, ip: '1.2.3.4', country: 'US', city: 'NYC' };
      writeCache(geo);
      expect(readCache()).toEqual(geo);
    });

    test('returns null for expired cache', () => {
      const geo = { ok: true, ip: '1.2.3.4' };
      writeCache(geo);
      
      // Mock expired cache by manipulating timestamp
      const expired = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      expired.timestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      fs.writeFileSync(CACHE_FILE, JSON.stringify(expired));
      
      expect(readCache()).toBeNull();
    });

    test('handles corrupted cache gracefully', () => {
      fs.writeFileSync(CACHE_FILE, 'not-valid-json');
      expect(readCache()).toBeNull();
    });
  });

  describe('getGeoWithCache', () => {
    test('returns cached data without calling API', async () => {
      const cached = { ok: true, ip: '1.2.3.4', country: 'US' };
      writeCache(cached);
      
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockRejectedValue(new Error('Should not call'))
      };
      
      const result = await getGeoWithCache(mockOsLayer);
      expect(result).toEqual(cached);
      expect(mockOsLayer.getPublicGeo).not.toHaveBeenCalled();
    });

    test('calls API when no cache', async () => {
      const apiResult = { ok: true, ip: '5.6.7.8', country: 'UK' };
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue(apiResult)
      };
      
      const result = await getGeoWithCache(mockOsLayer);
      expect(result).toEqual(apiResult);
      expect(mockOsLayer.getPublicGeo).toHaveBeenCalledTimes(1);
    });

    test('caches API result', async () => {
      const apiResult = { ok: true, ip: '5.6.7.8', country: 'UK' };
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue(apiResult)
      };
      
      await getGeoWithCache(mockOsLayer);
      
      // Second call should use cache
      const result = await getGeoWithCache(mockOsLayer);
      expect(result).toEqual(apiResult);
      expect(mockOsLayer.getPublicGeo).toHaveBeenCalledTimes(1);
    });

    test('does not cache failed results', async () => {
      const failedResult = { ok: false, error: 'timeout' };
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue(failedResult)
      };
      
      await getGeoWithCache(mockOsLayer);
      
      // Should not write cache for failed result
      expect(readCache()).toBeNull();
    });
  });

  describe('run function', () => {
    test('returns warning when geo lookup fails', async () => {
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({ ok: false, error: 'timeout' })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('Could not determine');
    });

    test('returns ok when no policy configured', async () => {
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({
          ok: true,
          ip: '1.2.3.4',
          country: 'US',
          city: 'New York',
          org: 'Test ISP'
        })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('ok');
      expect(result.message).toContain('New York');
      expect(result.message).toContain('US');
    });

    test('returns warning when country mismatch', async () => {
      process.env.RAKSHAK_EXPECTED_COUNTRY = 'India';
      
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({
          ok: true,
          ip: '1.2.3.4',
          country: 'US',
          city: 'New York'
        })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('connected from US');
      expect(result.message).toContain('expected India');
    });

    test('returns warning when ASN not in approved list', async () => {
      process.env.RAKSHAK_EXPECTED_ASNS = 'AS12345,AS67890';
      
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({
          ok: true,
          ip: '1.2.3.4',
          country: 'US',
          city: 'NYC',
          asn: 'AS99999',
          org: 'Suspicious ISP'
        })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('warning');
      expect(result.message).toContain('non-approved network');
    });

    test('returns ok when ASN is in approved list', async () => {
      process.env.RAKSHAK_EXPECTED_ASNS = 'AS12345,AS67890';
      
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({
          ok: true,
          ip: '1.2.3.4',
          country: 'US',
          asn: 'AS12345'
        })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('ok');
    });

    test('case-insensitive country comparison', async () => {
      process.env.RAKSHAK_EXPECTED_COUNTRY = 'india';
      
      const mockOsLayer = {
        getPublicGeo: jest.fn().mockResolvedValue({
          ok: true,
          ip: '1.2.3.4',
          country: 'INDIA'
        })
      };
      
      const result = await networkLocation.run({ osLayer: mockOsLayer });
      
      expect(result.status).toBe('ok');
    });
  });
});
