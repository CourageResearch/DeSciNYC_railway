import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "descinyc_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof session.exp === "number" && session.exp > Date.now();
  } catch {
    return false;
  }
}

export async function setAdminSession() {
  const store = await cookies();
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS,
    })
  ).toString("base64url");

  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export function checkAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }

  return safeEqual(password, expected);
}
