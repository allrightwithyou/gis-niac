/**
 * 
Сессия администратора: подписанный токен в httpOnly-cookie.
 * 
 *
 * 
 * 
Файл работает и в middleware (Edge), и в Node — только Web Crypto, без Node-модулей.
Токен: base64url({ exp }) + "." + base64url(HMAC-SHA256(payload, SESSION_SECRET)).
Подделать его без SESSION_SECRET нельзя; срок жизни проверяется при каждом запросе.
 */
export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 часов
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
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
export async function createSessionToken(): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getKey(),
    encoder.encode(payload) as BufferSource,
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}
export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    // crypto.subtle.verify сравнивает подпись за постоянное время
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(payload) as BufferSource,
    );
    if (!valid) return false;
    const { exp } = JSON.parse(decoder.decode(fromBase64Url(payload))) as {
      exp?: unknown;
    };
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
