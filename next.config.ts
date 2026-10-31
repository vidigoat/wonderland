import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Verified generated worlds are read from disk at request time, and the Gatekeeper's rules load SQLite's wasm
  // from public/ on the server (Ada, the judge's runs); ship both with every server function.
  outputFileTracingIncludes: { "/**": ["./data/worlds/**/*", "./public/sql-wasm.wasm"] },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
