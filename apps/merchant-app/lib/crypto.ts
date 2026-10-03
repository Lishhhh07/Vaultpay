import crypto from "crypto";
const raw = process.env.DATA_ENCRYPTION_KEY;
if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set");
const master = Buffer.from(raw, "base64");
if (master.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
// separate subkeys for separate jobs, so one key is never reused for two purposes
const subkey = (info: string) =>
  Buffer.from(crypto.hkdfSync("sha256", master, Buffer.alloc(0), info, 32));
const ENC_KEY = subkey("paytm-merchant/enc/v1");
const FP_KEY = subkey("paytm-merchant/fingerprint/v1");
/** AES-256-GCM. `context` is authenticated, so a ciphertext copied to another merchant's row fails to decrypt. */
export function encrypt(plain: string, context: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  cipher.setAAD(Buffer.from(context));
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}
/** Server-side only, for settlement also also Never expose the result to the browser. */
export function decrypt(payload: string, context: string): string {
  const [v, iv, tag, ct] = payload.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Bad ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(iv, "base64"));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

/** Keyed hash:  spot duplicate accounts.. A plain SHA-256 of a 12-digit number would be brute-forceable. */
export function fingerprint(value: string): string {
  return crypto.createHmac("sha256", FP_KEY).update(value).digest("hex");
}