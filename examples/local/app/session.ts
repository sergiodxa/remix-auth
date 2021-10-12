import { createCookieSessionStorage } from "@remix-run/server-runtime";

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secrets: ["s3cr3t"],
  },
});

export let { commitSession, destroySession } = sessionStorage;

export async function getSession(request: Request) {
  return sessionStorage.getSession(request.headers.get("Cookie"));
}
