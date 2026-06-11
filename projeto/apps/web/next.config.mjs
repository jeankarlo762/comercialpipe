import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: { outputFileTracingRoot: repoRoot },
  transpilePackages: ['@commercialpipe/shared-types'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
