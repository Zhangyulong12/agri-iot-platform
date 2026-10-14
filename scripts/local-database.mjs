import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const apiEnv = resolve(root, 'apps/api/.env');
process.loadEnvFile(apiEnv);
const url = new URL(process.env.DATABASE_URL);
if (
  process.platform !== 'win32' ||
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !/^\d+$/.test(url.port) ||
  !/^[a-z_][a-z0-9_]*$/.test(decodeURIComponent(url.username))
)
  throw new Error('本地数据库脚本仅支持 Windows、本机地址、显式端口和简单用户名。');
const binaries = resolve(
  root,
  '.local-tools/node_modules/@embedded-postgres/windows-x64/native/bin',
);
if (!existsSync(resolve(binaries, 'pg_ctl.exe')))
  throw new Error('缺少本地 PostgreSQL 工具，请按 README 安装，或使用 Docker Compose。');
const data = resolve(root, '.local-db/data');
const log = resolve(root, '.local-db/postgres.log');
function run(program, args, allowFailure = false) {
  const result = spawnSync(resolve(binaries, `${program}.exe`), args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (!allowFailure && (result.error || result.status !== 0))
    throw new Error(`${program} 执行失败，请检查 ${log}（不重置已有数据）。`);
  return result;
}
const action = process.argv[2];
if (action === 'down') {
  run('pg_ctl', ['-D', data, 'stop', '-m', 'fast', '-w']);
  console.log('本地 PostgreSQL 已停止，数据保留。');
} else if (action === 'up') {
  mkdirSync(data, { recursive: true });
  if (!existsSync(resolve(data, 'PG_VERSION'))) {
    const passwordFile = resolve(root, '.local-db/.init-password');
    writeFileSync(passwordFile, decodeURIComponent(url.password), { flag: 'wx' });
    try {
      run('initdb', [
        '-D',
        data,
        '-U',
        decodeURIComponent(url.username),
        '--pwfile',
        passwordFile,
        '--auth-host=scram-sha-256',
        '--auth-local=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
      ]);
    } finally {
      unlinkSync(passwordFile);
    }
  }
  if (run('pg_ctl', ['-D', data, 'status'], true).status !== 0)
    run('pg_ctl', ['-D', data, '-l', log, '-o', `-h 127.0.0.1 -p ${url.port}`, '-w', 'start']);
  const require = createRequire(resolve(root, 'apps/api/package.json'));
  const { Client } = require('pg');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.href, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    const test = new URL(url);
    test.pathname = '/flowdesk_auth_test';
    const configuredTest = process.env.TEST_DATABASE_URL
      ? new URL(process.env.TEST_DATABASE_URL)
      : test;
    if (
      configuredTest.host !== url.host ||
      !configuredTest.pathname.endsWith('_test') ||
      configuredTest.pathname === url.pathname
    )
      throw new Error('本地测试数据库必须是同一实例的独立 _test 数据库。');
    for (const name of [
      decodeURIComponent(url.pathname.slice(1)),
      decodeURIComponent(configuredTest.pathname.slice(1)),
    ]) {
      if (!/^[a-z_][a-z0-9_]*$/.test(name))
        throw new Error('本地数据库名只允许小写字母、数字和下划线。');
      const found = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
      if (!found.rowCount) await client.query(`CREATE DATABASE "${name}"`);
    }
    if (!process.env.TEST_DATABASE_URL) {
      const content = readFileSync(apiEnv, 'utf8');
      const line = `TEST_DATABASE_URL=${test.href}`;
      writeFileSync(
        apiEnv,
        /^TEST_DATABASE_URL=.*$/m.test(content)
          ? content.replace(/^TEST_DATABASE_URL=.*$/m, line)
          : `${content.trimEnd()}\n${line}\n`,
      );
    }
    console.log('真实 PostgreSQL 已启动；开发数据库与独立测试数据库已准备，凭据未输出。');
  } finally {
    await client.end();
  }
} else throw new Error('用法：node scripts/local-database.mjs up|down');
