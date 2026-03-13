import { execSync } from 'child_process';

let gitCommit = 'no-git-info';
try {
  // Fix for git in Docker containers: allow current directory
  execSync('git config --global --add safe.directory /app');
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not get git commit hash, using fallback. Error:', e.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  },
};

export default nextConfig;
