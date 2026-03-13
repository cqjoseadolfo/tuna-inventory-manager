import { execSync } from 'child_process';

const gitCommit = execSync('git rev-parse --short HEAD').toString().trim();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
};

export default nextConfig;
