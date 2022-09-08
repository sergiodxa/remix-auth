import { createCookieSessionStorage } from "@remix-run/node";
import { json, redirect } from "@remix-run/server-runtime";
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

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    await expect(
      authorizer.authorize({
        request,
        params: { id: "1" },
        context: {},
        data: "something",
      })
    ).resolves.toEqual(user);
  });

  async function isAdminWithNumber({ user }: { user: User; data?: number }) {
    return user.role === "admin";
  }

  test("if user is not logged in throw a Unauthorized response", async () => {
    let request = new Request("/", {});

    let authorizer = new Authorizer(authenticator, [isAdminWithNumber]);

    await expect(
      authorizer.authorize(
        {
          request,
          params: { id: "1" },
          context: {},
          data: 10,
        },
        {
          rules: [],
        }
      )
    ).rejects.toEqual(json({ message: "Not authenticated." }, { status: 401 }));
  });

  test("if user is not logged in an failureRedirect is defined redirect", async () => {
    let request = new Request("/", {});

    let authorizer = new Authorizer(authenticator, [
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

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer(authenticator, [
      async function isNotAdmin({ user }) {
        return user.role !== "admin";
      },
    ]);

    await expect(
      authorizer.authorize({ request, params: { id: "1" }, context: {} })
    ).rejects.toEqual(
      json({ message: "Forbidden by policy isNotAdmin" }, { status: 403 })
    );
  });

  test("if user doesn't pass rule throw a Forbidden response without the policy name if it's an arrow function", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer(authenticator);

    await expect(
      authorizer.authorize({ request, params: { id: "1" }, context: {} })
    ).rejects.toEqual(json({ message: "Forbidden" }, { status: 403 }));
  });

  test("if user doesn't pass rule and failureRedirect is defined throw a redirect", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isNotAdmin({ user }) {
        return user.role !== "admin";
      },
    ]);

    await expect(
      authorizer.authorize(
        { request, params: { id: "1" }, context: {}, data: "" },
        { raise: "redirect", failureRedirect: "/login" }
      )
    ).rejects.toEqual(redirect("/login"));
  });
});
