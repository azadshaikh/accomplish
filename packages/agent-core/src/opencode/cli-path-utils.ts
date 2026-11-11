/**
 * CLI path resolution utilities
 *
 * Platform detection and path helpers for locating the OpenCode CLI binary.
 * Extracted from cli-resolver.ts to keep file sizes under 200 lines.
 *
 * Exactly one platform binary ships per OS/arch: the AVX2 x64 builds (or the
 * ARM64 build). Non-AVX2 "baseline", musl and arm64-musl variants are not
 * bundled, so the installer carries a single ~200 MB binary instead of four.
 */

import path from 'path';
import fs from 'fs';
import { createConsoleLogger } from '../utils/logging.js';
import type { ResolvedCliPaths } from '../types.js';

const log = createConsoleLogger({ prefix: 'CLIResolver' });

const WINDOWS_OPENCODE_X64_PACKAGE = 'opencode-windows-x64';
const LINUX_OPENCODE_X64_PACKAGE = 'opencode-linux-x64';
const LINUX_OPENCODE_ARM64_PACKAGE = 'opencode-linux-arm64';
const DARWIN_OPENCODE_ARM64_PACKAGE = 'opencode-darwin-arm64';
const DARWIN_OPENCODE_X64_PACKAGE = 'opencode-darwin-x64';
export const OPENCODE_LAUNCHER_PACKAGE = 'opencode-ai';

/**
 * The packages that must ship for the current platform. There is no fallback
 * list on purpose: a second binary would double the installer size, and the
 * non-AVX2 builds only serve x64 CPUs older than Haswell (2013).
 */
export function getOpenCodePlatformInfo(): { packageNames: string[]; binaryName: string } {
  if (process.platform === 'win32') {
    return { packageNames: [WINDOWS_OPENCODE_X64_PACKAGE], binaryName: 'opencode.exe' };
  }
  if (process.platform === 'linux') {
    return {
      packageNames: [
        process.arch === 'arm64' ? LINUX_OPENCODE_ARM64_PACKAGE : LINUX_OPENCODE_X64_PACKAGE,
      ],
      binaryName: 'opencode',
    };
  }
  return {
    packageNames: [
      process.arch === 'arm64' ? DARWIN_OPENCODE_ARM64_PACKAGE : DARWIN_OPENCODE_X64_PACKAGE,
    ],
    binaryName: 'opencode',
  };
}

export function getCandidateAppRoots(appPath?: string): string[] {
  const roots: string[] = [];

  if (process.env.APP_ROOT) {
    roots.push(path.resolve(process.env.APP_ROOT));
  }

  if (appPath) {
    const resolvedAppPath = path.resolve(appPath);
    roots.push(resolvedAppPath);
    roots.push(path.resolve(resolvedAppPath, '..'));
    roots.push(path.resolve(resolvedAppPath, '..', '..'));
  }

  return [...new Set(roots)];
}

export function resolveWindowsCliFromLauncher(
  nodeModulesRoot: string,
  packageNames: string[],
): ResolvedCliPaths | null {
  const launcherPackagePath = path.join(nodeModulesRoot, OPENCODE_LAUNCHER_PACKAGE);
  if (!fs.existsSync(launcherPackagePath)) {
    return null;
  }

  const candidateModuleRoots = new Set<string>([nodeModulesRoot]);
  try {
    const realLauncherPackagePath = fs.realpathSync(launcherPackagePath);
    candidateModuleRoots.add(path.dirname(realLauncherPackagePath));
  } catch {
    // Ignore realpath failures and continue with known roots.
  }

  for (const moduleRoot of candidateModuleRoots) {
    for (const packageName of packageNames) {
      const cliPath = path.join(moduleRoot, packageName, 'bin', 'opencode.exe');
      if (fs.existsSync(cliPath)) {
        log.info(`[CLI Resolver] Using OpenCode CLI executable via launcher package: ${cliPath}`);
        return {
          cliPath,
          cliDir: path.dirname(cliPath),
          source: 'local',
        };
      }
    }
  }

  return null;
}
