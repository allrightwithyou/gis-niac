import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { pool } from "./db";
import { signMapToken, verifyMapToken } from "./map-token";

/** Пропуск к карте действует 8 часов. */
export const MAP_ACCESS_TTL_SECONDS = 60 * 60 * 1;

export const mapAccessCookieName = (resourceId: number) => `map_access_${resourceId}`;

const scrypt = (password: string, salt: Buffer, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, (error, key) => (error ? reject(error) : resolve(key)));
  });

/** Хеш пароля: «scrypt$соль$хеш». Сам пароль нигде не хранится. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 32);

  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function getStoredHash(resourceId: number): Promise<string | null> {
  const { rows } = await pool.query<{ password_hash: string }>(
    "select password_hash from map_passwords where resource_id = $1",
    [resourceId],
  );

  return rows[0]?.password_hash ?? null;
}

/** Карты, у которых задан пароль, — для админки. */
export async function listProtectedMaps(): Promise<number[]> {
  const { rows } = await pool.query<{ resource_id: number }>(
    "select resource_id from map_passwords order by resource_id",
  );

  return rows.map((row) => row.resource_id);
}

export async function setMapPassword(resourceId: number, password: string): Promise<void> {
  await pool.query(
    `insert into map_passwords (resource_id, password_hash) values ($1, $2)
     on conflict (resource_id) do update set password_hash = excluded.password_hash, updated_at = now()`,
    [resourceId, await hashPassword(password)],
  );
}

export async function clearMapPassword(resourceId: number): Promise<void> {
  await pool.query("delete from map_passwords where resource_id = $1", [resourceId]);
}

const fingerprint = (hash: string) => createHash("sha256").update(hash).digest("hex").slice(0, 16);

/**
 * Можно ли показывать карту этому посетителю: у карты нет пароля либо у посетителя есть
 * действующий пропуск (cookie). Пропуск привязан к текущему паролю — после его смены старые не работают.
 */
export async function hasMapAccess(resourceId: number): Promise<boolean> {
  const stored = await getStoredHash(resourceId);
  if (!stored) return true;

  const store = await cookies();
  const payload = await verifyMapToken(store.get(mapAccessCookieName(resourceId))?.value);

  return payload !== null && payload.m === resourceId && payload.f === fingerprint(stored);
}

export type UnlockResult =
  | { status: "open" } // у карты нет пароля
  | { status: "ok"; token: string } // пароль верный, выдан пропуск
  | { status: "wrong" };

export async function tryUnlock(resourceId: number, password: string): Promise<UnlockResult> {
  const stored = await getStoredHash(resourceId);
  if (!stored) return { status: "open" };

  if (!(await verifyPassword(password, stored))) return { status: "wrong" };

  const token = await signMapToken({
    m: resourceId,
    f: fingerprint(stored),
    exp: Math.floor(Date.now() / 1000) + MAP_ACCESS_TTL_SECONDS,
  });

  return { status: "ok", token };
}
