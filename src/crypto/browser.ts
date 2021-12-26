import { Crypto } from "./types";

class WebCrypto implements Crypto {
  private keyUsages: KeyUsage[] = ["encrypt", "decrypt"];

  async generateKey(): Promise<ArrayBuffer> {
    let algoKeyGen = {
      name: "AES-GCM",
      length: 256,
    };

    let key = await crypto.subtle.generateKey(
      algoKeyGen,
      false,
      this.keyUsages
    );

    return await window.crypto.subtle.exportKey("raw", key);
  }

  async encrypt(key: ArrayBuffer, value: string): Promise<string> {
    let iv = crypto.getRandomValues(new Uint8Array(12));

    let encryptionKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      "AES-GCM",
      true,
      this.keyUsages
    );

    let algoEncrypt = {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    };

    let cipherText: ArrayBuffer = await crypto.subtle.encrypt(
      algoEncrypt,
      encryptionKey,
      this.strToArrayBuffer(value)
    );

    let encrypted = this.arrayBufferToString(cipherText);

    return `${iv.toString()}:${encrypted.toString()}`;
  }

  async decrypt(key: ArrayBuffer, value: string) {
    let encryptionKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      "AES-GCM",
      true,
      this.keyUsages
    );

    let [ivPart, encryptedPart] = value.split(":");

    if (!ivPart || !encryptedPart) {
      throw new Error("Invalid text.");
    }

    let algoEncrypt = {
      name: "AES-GCM",
      iv: ivPart,
      tagLength: 128,
    };

    let cipherText = this.strToArrayBuffer(value);

    let buffer: ArrayBuffer = await crypto.subtle.decrypt(
      algoEncrypt,
      encryptionKey,
      cipherText
    );

    return this.arrayBufferToString(buffer);
  }

  private strToArrayBuffer(str: string): ArrayBuffer {
    return new TextEncoder().encode(str);
  }

  private arrayBufferToString(buf: ArrayBuffer): string {
    return new TextDecoder().decode(buf);
  }
}

export default new WebCrypto();
