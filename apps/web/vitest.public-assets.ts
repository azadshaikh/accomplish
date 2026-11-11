/**
 * Vite plugin: stub public asset imports for tests.
 *
 * The renderer imports files from `public/` with root-relative specifiers
 * (e.g. `import logo from '/assets/ai-logos/openai.svg'`). In a browser those
 * resolve to the dev-server URL, but under Vitest every id is treated as a
 * file URL — and on Windows `fileURLToPath('/assets/...')` throws
 * `ERR_INVALID_ARG_VALUE` because there is no drive letter.
 *
 * Rewriting the specifier to a virtual module keeps the import working while
 * the app itself keeps using the documented ES-module asset convention.
 */

const PUBLIC_ASSET_PREFIX = '/assets/';
const VIRTUAL_PREFIX = '\0public-asset:';

export function publicAssetsStub(): import('vite').Plugin {
  return {
    name: 'vitest-public-assets-stub',
    enforce: 'pre',
    resolveId(id) {
      const specifier = id.split('?')[0];
      if (specifier.startsWith(PUBLIC_ASSET_PREFIX)) {
        return VIRTUAL_PREFIX + specifier;
      }
      return null;
    },
    load(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const specifier = id.slice(VIRTUAL_PREFIX.length);
        return `export default ${JSON.stringify(specifier)};`;
      }
      return null;
    },
  };
}
