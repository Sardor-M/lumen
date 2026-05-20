import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const nextConfig: NextConfig = {
    /**
     * `better-sqlite3` plus its transitive native-binding deps must stay
     * external. When `lumen-kb` is transpiled via `transpilePackages`, webpack
     * follows the import graph into these packages and tries to bundle them —
     * but `bindings` reads `__filename` off a stack trace at runtime, which
     * webpack rewrites to `undefined`. That triggers the
     * `Cannot read properties of undefined (reading 'indexOf')` crash inside
     * `bindings.js:178`. Marking the whole native-load chain external keeps
     * Node's real module resolution in charge for these.
     */
    serverExternalPackages: ['better-sqlite3', 'better-auth', 'bindings', 'sqlite-vec'],
    outputFileTracingRoot: resolve(__dirname, '../..'),
    transpilePackages: ['lumen-kb'],
    /**
     * Node 23 breaks webpack's WASM-based xxhash64.
     * Force sha256 and disable the build worker as a workaround.
     * Production build still crashes on Node 23 — use Node 22 LTS for `next build`.
     * Dev mode (`next dev`) works on all Node versions.
     */
    webpack: (config, { isServer }) => {
        if (config.output) {
            config.output.hashFunction = 'sha256';
        }
        /** Let webpack resolve `.js` imports (ESM style in lumen-kb) against `.ts` source. */
        config.resolve = config.resolve ?? {};
        config.resolve.extensionAlias = {
            ...(config.resolve.extensionAlias ?? {}),
            '.js': ['.ts', '.tsx', '.js', '.jsx'],
        };
        /**
         * `serverExternalPackages` does not apply to deps reached transitively
         * through `transpilePackages`. We import `lumen-kb` source, which
         * pulls in `better-sqlite3` and `sqlite-vec` — both native-binding
         * packages that webpack must not bundle. `bindings` reads its caller
         * filename from a stack trace; webpack rewrites that to undefined,
         * causing the runtime "Cannot read properties of undefined (reading
         * 'indexOf')" crash inside `bindings.js:178`. Push explicit externals
         * for the server bundle to keep them as Node `require()`s.
         */
        if (isServer) {
            const nativeExternals = ['better-sqlite3', 'bindings', 'sqlite-vec'];
            const existing = config.externals ?? [];
            const existingArr = Array.isArray(existing) ? existing : [existing];
            config.externals = [
                ...existingArr,
                (
                    { request }: { request?: string },
                    callback: (err: null, result?: string) => void,
                ) => {
                    if (request && nativeExternals.includes(request)) {
                        return callback(null, `commonjs ${request}`);
                    }
                    callback(null);
                },
            ];
        }
        return config;
    },
    experimental: {
        webpackBuildWorker: false,
    },
};

export default nextConfig;
