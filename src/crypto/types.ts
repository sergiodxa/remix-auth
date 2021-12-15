export interface Crypto {
  generateKey(secret: string): Promise<ArrayBuffer>;
  encrypt(key: ArrayBuffer, value: string): Promise<string>;
  decrypt(key: ArrayBuffer, value: string): Promise<string>;
}
