function strToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str);
}

function arrayBufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

let keyUsages: KeyUsage[] = ["encrypt", "decrypt"];

async function generateKey(secret: string): Promise<ArrayBuffer> {
  let algoKeyGen = {
    name: "AES-GCM",
    length: 256,
  };

  const key = await crypto.subtle.generateKey(algoKeyGen, false, keyUsages);
  return await window.crypto.subtle.exportKey("raw", key);
}

async function encrypt({
  key,
  text,
}: {
  key: ArrayBuffer;
  text: string;
}): Promise<string> {
  let iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptionKey = await window.crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    keyUsages
  );

  let algoEncrypt = {
    name: "AES-GCM",
    iv: iv,
    tagLength: 128,
  };

  const cipherText: ArrayBuffer = await crypto.subtle.encrypt(
    algoEncrypt,
    encryptionKey,
    strToArrayBuffer(text)
  );
  const encrypted = arrayBufferToString(cipherText);
  return `${iv.toString()}:${encrypted.toString()}`;
}

async function decrypt({ key, text }: { key: ArrayBuffer; text: string }) {
  const encryptionKey = await window.crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    keyUsages
  );
  let [ivPart, encryptedPart] = text.split(":");
  if (!ivPart || !encryptedPart) {
    throw new Error("Invalid text.");
  }
  let algoEncrypt = {
    name: "AES-GCM",
    iv: ivPart,
    tagLength: 128,
  };
  const cipherText = strToArrayBuffer(text);
  const buffer: ArrayBuffer = await crypto.subtle.decrypt(
    algoEncrypt,
    encryptionKey,
    cipherText
  );
  return arrayBufferToString(buffer);
}

export { generateKey, encrypt, decrypt };
