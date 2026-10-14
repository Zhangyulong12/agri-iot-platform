import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.loadEnvFile(fileURLToPath(new URL('../apps/api/.env', import.meta.url)));
if (!process.env.TEST_DATABASE_URL)
  throw new Error('请配置独立的 TEST_DATABASE_URL，数据库名必须以 _test 结尾。');
const target = new URL(process.env.TEST_DATABASE_URL);
const development = new URL(process.env.DATABASE_URL);
if (
  !target.pathname.endsWith('_test') ||
  decodeURIComponent(target.pathname) === decodeURIComponent(development.pathname)
)
  throw new Error('测试数据库必须独立于开发数据库，数据库名必须以 _test 结尾。');
const env = {
  ...process.env,
  DEV_DATABASE_URL: development.href,
  DATABASE_URL: target.href,
  RUN_DATABASE_TESTS: 'true',
};
for (const args of [
  ['--filter', '@flowdesk/api', 'db:deploy'],
  ['--filter', '@flowdesk/api', 'test', '--runTestsByPath', 'test/auth.integration.spec.ts'],
]) {
  const result = spawnSync('pnpm', args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
