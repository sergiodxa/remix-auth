import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { Authenticator, Authorizer, createAuthorizer } from "../src";

describe(Authorizer, () => {
  type User = {
    id: number;
    token: string;
    email: string;
    role: string;
  };

  let sessionStorage = createCookieSessionStorage({
    cookie: { name: "session", secrets: ["s3cr3ts"], path: "/" },
  });

  let authenticator = new Authenticator<User>(sessionStorage);

  let user: User = {
    id: 1,
    token: "token",
    email: "test@example.com",
    role: "admin",
  };

  test("function", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = createAuthorizer<User>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    let result = await authorizer(
      {
        request,
        params: { id: "1" },
        context: {},
      },
      {
        rules: [
          async function isOwner({ params, user }) {
            return Number(params.id) === user.id;
          },
        ],
      }
    );

    expect(result).toEqual(user);
  });

  test("class", async () => {
    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
    ]);

    let result = await authorizer.authorize({
      request,
      params: { id: "1" },
      context: {},
    });

    expect(result).toEqual(user);
  });
});
