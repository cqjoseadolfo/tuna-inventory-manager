import { execSync } from 'child_process';

let gitCommit = 'no-git-info';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not get git commit hash, using fallback.');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
  },
};

export default nextConfig;
