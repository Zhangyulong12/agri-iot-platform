import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

@Injectable()
export class PasswordService {
  private readonly dummyHash = this.hash(randomBytes(32).toString('hex'));

  private derive(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) =>
      scrypt(
        password,
        salt,
        64,
        { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  }

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    return `scrypt$32768$8$3$${salt}$${(await this.derive(password, salt)).toString('hex')}`;
  }

  async verify(password: string, hash: string | null | undefined): Promise<boolean> {
    const value = hash ?? (await this.dummyHash);
    const parts = value.split('$');
    const salt = parts[4];
    const digest = parts[5];
    if (
      parts.length !== 6 ||
      parts.slice(0, 4).join('$') !== 'scrypt$32768$8$3' ||
      !salt ||
      !digest ||
      !/^[a-f0-9]{32}$/.test(salt) ||
      !/^[a-f0-9]{128}$/.test(digest)
    )
      return false;
    const derived = await this.derive(password, salt);
    return timingSafeEqual(derived, Buffer.from(digest, 'hex')) && Boolean(hash);
  }
}
