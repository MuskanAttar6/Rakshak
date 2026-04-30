'use strict';

const { describe, test, expect } = require('@jest/globals');
const { run, runPS, runLegacy, isSafe, ALLOWED_COMMANDS } = require('../os/shell-secure');

describe('shell-secure', () => {
  describe('isSafe', () => {
    test('allows ping command', () => {
      expect(isSafe('ping', ['-n', '4', '8.8.8.8'])).toBe(true);
    });

    test('blocks unknown commands', () => {
      expect(isSafe('rm', ['-rf', '/'])).toBe(false);
      expect(isSafe('cat', ['/etc/passwd'])).toBe(false);
    });

    test('blocks dangerous characters in args', () => {
      expect(isSafe('ping', ['8.8.8.8;ls'])).toBe(false);
      expect(isSafe('ping', ['8.8.8.8|cat'])).toBe(false);
      expect(isSafe('ping', ['8.8.8.8\`whoami\`'])).toBe(false);
      expect(isSafe('ping', ['8.8.8.8$(rm)'])).toBe(false);
    });

    test('allows safe alphanumeric args', () => {
      expect(isSafe('git', ['--version'])).toBe(true);
      expect(isSafe('docker', ['--version'])).toBe(true);
    });
  });

  describe('run', () => {
    test('executes ping successfully', async () => {
      const result = await run('ping', process.platform === 'win32' 
        ? ['-n', '1', '127.0.0.1'] 
        : ['-c', '1', '127.0.0.1']
      );
      
      expect(result.code).toBe(0);
      expect(result.error).toBeNull();
      expect(result.stdout).toContain('127.0.0.1');
    });

    test('blocks unsafe commands', async () => {
      const result = await run('rm', ['-rf', '/tmp/test']);
      
      expect(result.code).toBe(1);
      expect(result.error).toBeTruthy();
      expect(result.stderr).toContain('Command blocked');
    });

    test('git version works', async () => {
      const result = await run('git', ['--version']);
      
      // Git might not be installed in test environment
      if (result.code === 0) {
        expect(result.stdout).toContain('git version');
      }
    });
  });

  describe('runLegacy', () => {
    test('parses and executes simple command', async () => {
      const result = await runLegacy(
        process.platform === 'win32' 
          ? 'ping -n 1 127.0.0.1' 
          : 'ping -c 1 127.0.0.1'
      );
      
      expect(result.code).toBe(0);
    });

    test('blocks commands with dangerous chars', async () => {
      const result = await runLegacy('ping 8.8.8.8; ls');
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('dangerous characters');
    });
  });

  describe('runPS', () => {
    test('executes simple PowerShell on Windows', async () => {
      if (process.platform !== 'win32') {
        // Skip on non-Windows
        return;
      }
      
      const result = await runPS('Get-Date');
      expect(result.code).toBe(0);
    });

    test('blocks PowerShell with dangerous chars', async () => {
      if (process.platform !== 'win32') {
        return;
      }
      
      const result = await runPS('Get-Date; Remove-Item C:\\');
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('dangerous');
    });
  });
});
