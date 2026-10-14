import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const rootEnv = resolve(root, '.env');
if (!existsSync(rootEnv)) {
  const example = readFileSync(resolve(root, '.env.example'), 'utf8');
  writeFileSync(
    rootEnv,
    example.replace('POSTGRES_PASSWORD=', `POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}`),
    { flag: 'wx' },
  );
  console.log('已创建根目录 .env，使用随机本地数据库密码。');
}
const values = Object.fromEntries(
  readFileSync(rootEnv, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return [
        line.slice(0, separator).trim(),
        line
          .slice(separator + 1)
          .trim()
          .replace(/^['"]|['"]$/g, ''),
      ];
    }),
);
for (const key of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'POSTGRES_PORT']) {
  if (!values[key]) throw new Error(`根目录 .env 缺少 ${key}，请填写后重新运行。`);
}
const apiEnv = resolve(root, 'apps/api/.env');
if (!existsSync(apiEnv)) {
  const url = `postgresql://${encodeURIComponent(values.POSTGRES_USER)}:${encodeURIComponent(values.POSTGRES_PASSWORD)}@localhost:${values.POSTGRES_PORT}/${encodeURIComponent(values.POSTGRES_DB)}`;
  writeFileSync(
    apiEnv,
    readFileSync(resolve(root, 'apps/api/.env.example'), 'utf8').replace(
      'DATABASE_URL=',
      `DATABASE_URL=${url}`,
    ),
    { flag: 'wx' },
  );
  console.log('已创建 apps/api/.env。');
}
const webEnv = resolve(root, 'apps/web/.env');
const existingApi = readFileSync(apiEnv, 'utf8');
if (!/^JWT_SECRET=.+$/m.test(existingApi)) {
  const secretLine = `JWT_SECRET=${randomBytes(48).toString('base64url')}`;
  writeFileSync(
    apiEnv,
    /^JWT_SECRET=.*$/m.test(existingApi)
      ? existingApi.replace(/^JWT_SECRET=.*$/m, secretLine)
      : `${existingApi.trimEnd()}\n${secretLine}\n`,
  );
  console.log('已补充本地 JWT 随机密钥；现有其他配置保留。');
}
if (!existsSync(webEnv)) {
  writeFileSync(webEnv, readFileSync(resolve(root, 'apps/web/.env.example'), 'utf8'), {
    flag: 'wx',
  });
  console.log('已创建 apps/web/.env。');
}
console.log('已有环境文件已保留；手动改动数据库配置时请同步更新 API 的 DATABASE_URL。');
