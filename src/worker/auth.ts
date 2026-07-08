import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";

export const SESSION_COOKIE_NAME = "session_token";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const SESSION_MAX_AGE_SECONDS = 60 * 60; // 60 minutos, mesma janela usada anteriormente

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export interface SessionUser {
  id: string;
  email: string;
  google_user_data: {
    name: string;
    picture?: string;
  };
}

interface AuthEnv {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

function sessionSecretKey(env: AuthEnv) {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none" as const,
    secure: true,
    maxAge,
  };
}

export function buildGoogleAuthorizeUrl(
  env: AuthEnv,
  redirectUri: string
): { url: string; state: string } {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  };
}

export function setOAuthStateCookie(c: Context, state: string) {
  setCookie(c, OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 5 * 60,
  });
}

export function verifyOAuthStateCookie(c: Context, state: string): boolean {
  const cookieState = getCookie(c, OAUTH_STATE_COOKIE_NAME);
  deleteCookie(c, OAUTH_STATE_COOKIE_NAME, { path: "/" });
  return !!cookieState && cookieState === state;
}

interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export async function exchangeGoogleCodeForUser(
  env: AuthEnv,
  code: string,
  redirectUri: string
): Promise<SessionUser> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Falha ao trocar código com o Google: ${tokenResponse.status}`);
  }

  const tokenBody = (await tokenResponse.json()) as { id_token?: string };
  if (!tokenBody.id_token) {
    throw new Error("Resposta do Google não contém id_token");
  }

  const { payload } = await jwtVerify(tokenBody.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
  });

  const claims = payload as unknown as GoogleIdTokenClaims;
  if (!claims.email) {
    throw new Error("Token do Google não contém email");
  }

  return {
    id: claims.sub,
    email: claims.email,
    google_user_data: {
      name: claims.name || claims.email.split("@")[0],
      picture: claims.picture,
    },
  };
}

export async function issueSessionCookie(c: Context, env: AuthEnv, user: SessionUser) {
  const token = await new SignJWT({
    email: user.email,
    name: user.google_user_data.name,
    picture: user.google_user_data.picture,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionSecretKey(env));

  setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(c: Context) {
  setCookie(c, SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
}

export const authMiddleware: MiddlewareHandler<{
  Bindings: AuthEnv;
  Variables: { user: SessionUser };
}> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return c.json({ error: "Não autenticado" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, sessionSecretKey(c.env));
    const user: SessionUser = {
      id: payload.sub!,
      email: payload.email as string,
      google_user_data: {
        name: payload.name as string,
        picture: payload.picture as string | undefined,
      },
    };
    c.set("user", user);

    // Renova a sessão (sliding expiration) a cada requisição autenticada bem-sucedida
    setCookie(c, SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  } catch {
    return c.json({ error: "Sessão inválida ou expirada" }, 401);
  }

  await next();
};
