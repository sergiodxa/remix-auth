import crypto from "crypto";

let algorithm = "aes-256-ctr";

async function generateKey(secret: string): Promise<Buffer> {
  return crypto.scryptSync(secret, "salt", 32);
}

async function encrypt({
  encryptionKey,
  text,
}: {
  encryptionKey: Buffer;
  text: string;
}): Promise<string> {
  let ivLength = 16;
  let iv = crypto.randomBytes(ivLength);

  let cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  let encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

async function decrypt({
  encryptionKey,
  text,
}: {
  encryptionKey: Buffer;
  text: string;
}): Promise<string> {
  let [ivPart, encryptedPart] = text.split(":");
  if (!ivPart || !encryptedPart) {
    throw new Error("Invalid text.");
  }

  let iv = Buffer.from(ivPart, "hex");
  let encryptedText = Buffer.from(encryptedPart, "hex");
  let decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  let decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);
  return decrypted.toString();
}

export { generateKey, encrypt, decrypt };
