import { PasswordService } from '../src/auth/password.service.js';

describe('Password storage', () => {
  const passwords = new PasswordService();
  it('uses independent salts and preserves spaces and Unicode', async () => {
    const password = ' 密码 with spaces 123 ';
    const first = await passwords.hash(password);
    const second = await passwords.hash(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await passwords.verify(password, first)).toBe(true);
    expect(await passwords.verify(password.trim(), first)).toBe(false);
    expect(await passwords.verify('incorrect password', first)).toBe(false);
  });
  it('denies unknown users, legacy users and malformed hashes', async () => {
    expect(await passwords.verify('long enough password', undefined)).toBe(false);
    expect(await passwords.verify('long enough password', null)).toBe(false);
    expect(await passwords.verify('long enough password', 'malformed')).toBe(false);
  });
});
