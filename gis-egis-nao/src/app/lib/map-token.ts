/**
 * Подписанный «пропуск» для карты с паролем (HMAC-SHA256 по SESSION_SECRET).
 * Формат: base64url(payload) + "." + base64url(подпись). Подделать без секрета нельзя.
 */

export interface MapAccessPayload {
  /** ID карты */
  m: number;
  /** «Отпечаток» текущего хеша пароля: при смене пароля старые пропуска перестают действовать */
  f: string;
  /** Срок действия, секунды Unix */
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET не задан или короче 32 символов");
  }

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signMapToken(payload: MapAccessPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body) as BufferSource);

  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyMapToken(token: string | undefined): Promise<MapAccessPayload | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(body) as BufferSource,
    );

    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as Partial<MapAccessPayload>;

    if (
      typeof payload.m !== "number" ||
      typeof payload.f !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() / 1000
    ) {
      return null;
    }

    return { m: payload.m, f: payload.f, exp: payload.exp };
  } catch {
    return null;
  }
}
