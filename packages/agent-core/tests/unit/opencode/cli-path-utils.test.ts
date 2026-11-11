import { describe, it, expect } from 'vitest';
import { getOpenCodePlatformInfo } from '../../../src/opencode/cli-path-utils.js';

/**
 * The desktop app ships exactly one OpenCode binary per OS/arch. Shipping the
 * non-AVX2 baseline (and the musl builds) as well tripled the installer size
 * for hardware that is older than the 2013 Haswell baseline.
 */
describe('getOpenCodePlatformInfo', () => {
  it('resolves a single platform package per OS/arch', () => {
    const { packageNames, binaryName } = getOpenCodePlatformInfo();

    expect(packageNames).toHaveLength(1);
    expect(packageNames[0]).not.toMatch(/-baseline|-musl/);
    expect(packageNames[0].startsWith('opencode-')).toBe(true);
    expect(binaryName).toBe(process.platform === 'win32' ? 'opencode.exe' : 'opencode');
  });

  it('selects the binary that matches the host platform', () => {
    const { packageNames } = getOpenCodePlatformInfo();

    if (process.platform === 'win32') {
      expect(packageNames[0]).toBe('opencode-windows-x64');
    } else if (process.platform === 'linux') {
      expect(packageNames[0]).toBe(
        process.arch === 'arm64' ? 'opencode-linux-arm64' : 'opencode-linux-x64',
      );
    } else {
      expect(packageNames[0]).toBe(
        process.arch === 'arm64' ? 'opencode-darwin-arm64' : 'opencode-darwin-x64',
      );
    }
  });
});
