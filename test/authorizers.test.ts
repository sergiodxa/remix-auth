import { redirect } from "@remix-run/server-runtime";
import { createCookieSessionStorage } from "@remix-run/node";
import { Authenticator, Authorizer } from "../src";

describe(Authorizer, () => {
  type User = {
    id: number;
    token: string;
    email: string;
    role: string;
  };

  let user: User = {
    id: 1,
    token: "token",
    email: "test@example.com",
    role: "admin",
  };

  let sessionStorage = createCookieSessionStorage({
    cookie: { name: "session", secrets: ["s3cr3ts"], path: "/" },
  });

  let authenticator = new Authenticator<User>(sessionStorage);

  test("it should return the user as result", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    await expect(
      authorizer.authorize({ request, params: { id: "1" }, context: {} })
    ).resolves.toEqual(user);
  });

  test("if user is not logged in throw a Unauthorized response", async () => {
    let request = new Request("http://.../test", {});

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    try {
      await authorizer.authorize({ request, params: { id: "1" }, context: {} });
    } catch (error) {
      expect(error instanceof Response).toBe(true);
      const resp = error as Response;
      expect(resp.status).toBe(401);
      expect(await resp.json()).toEqual({ message: "Not authenticated." });
    }
  });

  test("if user is not logged in an failureRedirect is defined redirect", async () => {
    let request = new Request("http://.../test", {});

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    await expect(
      authorizer.authorize(
        { request, params: { id: "1" }, context: {} },
        { raise: "redirect", failureRedirect: "/login" }
      )
    ).rejects.toEqual(redirect("/login"));
  });

  test("if user doesn't pass rule throw a Forbidden response", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isNotAdmin({ user }) {
        return user.role !== "admin";
      },
    ]);

    try {
      await authorizer.authorize({ request, params: { id: "1" }, context: {} });
    } catch (error) {
      expect(error instanceof Response).toBe(true);
      const resp = error as Response;
      expect(resp.status).toBe(403);
      expect(await resp.json()).toEqual({
        message: "Forbidden by policy isNotAdmin",
      });
    }
  });

  test("if user doesn't pass rule throw a Forbidden response without the policy name if it's an arrow function", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async ({ user }) => user.role !== "admin",
    ]);

    try {
      await authorizer.authorize({ request, params: { id: "1" }, context: {} });
    } catch (error) {
      expect(error instanceof Response).toBe(true);
      const resp = error as Response;
      expect(resp.status).toBe(403);
      expect(await resp.json()).toEqual({
        message: "Forbidden",
      });
    }
  });

  test("if user doesn't pass rule and failureRedirect is defined throw a redirect", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isNotAdmin({ user }) {
        return user.role !== "admin";
      },
    ]);

    await expect(
      authorizer.authorize(
        { request, params: { id: "1" }, context: {} },
        { raise: "redirect", failureRedirect: "/login" }
      )
    ).rejects.toEqual(redirect("/login"));
  });
});
