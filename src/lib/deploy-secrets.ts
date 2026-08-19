import crypto from "crypto";

const PREFIX = "v1";

// Node's crypto typings require a plain Uint8Array<ArrayBuffer>; Buffer's own
// .buffer can be typed as ArrayBufferLike (which includes SharedArrayBuffer),
// so every Buffer that flows into a crypto call is copied through
// Uint8Array.from() first to satisfy the stricter type without changing bytes.
function key(): Uint8Array {
  const raw = process.env.DEPLOY_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("DEPLOY_TOKEN_ENCRYPTION_KEY is not configured.");
  const decoded = Buffer.from(raw, /^[0-9a-fA-F]{64}$/.test(raw) ? "hex" : "base64");
  if (decoded.length !== 32) {
    throw new Error("DEPLOY_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return Uint8Array.from(decoded);
}

/** Encrypts deployment OAuth tokens before they are persisted in Postgres. */
export function encryptDeployToken(token: string): string {
  const iv = Uint8Array.from(crypto.randomBytes(12));
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}.${Buffer.from(iv).toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptDeployToken(payload: string): string {
  const [prefix, ivText, tagText, ciphertextText] = payload.split(".");
  if (prefix !== PREFIX || !ivText || !tagText || !ciphertextText) throw new Error("Invalid encrypted deployment token.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Uint8Array.from(Buffer.from(ivText, "base64url")));
  decipher.setAuthTag(Uint8Array.from(Buffer.from(tagText, "base64url")));
  return Buffer.concat([decipher.update(Uint8Array.from(Buffer.from(ciphertextText, "base64url"))), decipher.final()]).toString("utf8");
}
