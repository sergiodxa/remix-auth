import crypto from "crypto";
import { Crypto } from "./types";

class NodeCrypto implements Crypto {
  private algorithm = "aes-256-ctr";

  async generateKey(secret: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(secret, "salt", 32, (error, key) => {
        if (error) return reject(error);
        return resolve(key);
      });
    });
  }

  async encrypt(key: Buffer, value: string): Promise<string> {
    let ivLength = 16;
    let iv = crypto.randomBytes(ivLength);

    let cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  }

  async decrypt(key: Buffer, value: string): Promise<string> {
    let [ivPart, encryptedPart] = value.split(":");
    if (!ivPart || !encryptedPart) {
      throw new Error("Invalid text.");
    }

    let iv = Buffer.from(ivPart, "hex");
    let encryptedText = Buffer.from(encryptedPart, "hex");
    let decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);
    return decrypted.toString();
  }
}

export default new NodeCrypto();
