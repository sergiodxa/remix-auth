import { redirect, SessionStorage } from "@remix-run/server-runtime";
import { createCookieSessionStorage } from "@remix-run/node";
import {
  AuthenticateOptions,
  Authenticator,
  AuthorizationError,
  Strategy,
} from "../src";

class MockStrategy<User> extends Strategy<User, Record<string, never>> {
  name = "mock";

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: AuthenticateOptions
  ) {
    let user = await this.verify({});
    if (user) return await this.success(user, request, sessionStorage, options);
    return await this.failure(
      "Invalid credentials",
      request,
      sessionStorage,
      options,
      new Error("Invalid credentials")
    );
  }
}

describe(Authenticator, () => {
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should be able to add a new strategy calling use", async () => {
    let request = new Request("http://.../test");
    let response = new Response("It works!", {
      // @ts-expect-error this should work
      url: "",
    });

    let authenticator = new Authenticator<Response>(sessionStorage);

    expect(authenticator.use(new MockStrategy(async () => response))).toBe(
      authenticator
    );
    expect(await authenticator.authenticate("mock", request)).toEqual(response);
  });

  test("should be able to remove a strategy calling unuse", async () => {
    let response = new Response("It works!");

    let authenticator = new Authenticator<Response>(sessionStorage);
    authenticator.use(new MockStrategy(async () => response));

    expect(authenticator.unuse("mock")).toBe(authenticator);
  });

  test("should throw if the strategy was not found", async () => {
    let request = new Request("http://.../test");
    let authenticator = new Authenticator(sessionStorage);

    expect(() => authenticator.authenticate("unknown", request)).toThrow(
      "Strategy unknown not found."
    );
  });

  test("should store the strategy provided name in the session if no custom name provided", async () => {
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authenticator = new Authenticator(sessionStorage, {
      sessionStrategyKey: "strategy-name",
    });
    authenticator.use(new MockStrategy(async () => user));

    try {
      await authenticator.authenticate("mock", request, {
        successRedirect: "/",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let cookie = error.headers.get("Set-Cookie");
      let responseSession = await sessionStorage.getSession(cookie);
      let strategy = responseSession.get(authenticator.sessionStrategyKey);
      expect(strategy).toBe("mock");
    }
  });

  test("should store the provided strategy name in the session", async () => {
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let authenticator = new Authenticator(sessionStorage, {
      sessionStrategyKey: "strategy-name",
    });
    authenticator.use(new MockStrategy(async () => user), "mock2");

    try {
      await authenticator.authenticate("mock2", request, {
        successRedirect: "/",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let cookie = error.headers.get("Set-Cookie");
      let responseSession = await sessionStorage.getSession(cookie);
      let strategy = responseSession.get(authenticator.sessionStrategyKey);
      expect(strategy).toBe("mock2");
    }
  });

  test("should redirect after logout", async () => {
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    session.set("user", user);
    session.set("strategy", "test");

    let request = new Request("http://.../test", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    expect(
      new Authenticator(sessionStorage, {
        sessionKey: "user",
      }).logout(request, { redirectTo: "/login" })
    ).rejects.toEqual(
      redirect("/login", {
        headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
      })
    );
  });

  describe("isAuthenticated", () => {
    test("should return the user if it's on the session", async () => {
      let user = { id: "123" };
      let session = await sessionStorage.getSession();
      session.set("user", user);

      let request = new Request("http://.../test", {
        headers: { Cookie: await sessionStorage.commitSession(session) },
      });

      expect(
        new Authenticator(sessionStorage, {
          sessionKey: "user",
        }).isAuthenticated(request)
      ).resolves.toEqual(user);
    });

    test("should return null if user isn't on the session", () => {
      let request = new Request("http://.../test");

      expect(
        new Authenticator(sessionStorage).isAuthenticated(request)
      ).resolves.toEqual(null);
    });

    test("should throw a redirect if failureRedirect is defined", () => {
      let request = new Request("http://.../test");
      let response = redirect("/login");

      expect(
        new Authenticator(sessionStorage).isAuthenticated(request, {
          failureRedirect: "/login",
        })
      ).rejects.toEqual(response);
    });

    test("should throw a redirect if successRedirect is defined", async () => {
      let user = { id: "123" };
      let session = await sessionStorage.getSession();
      session.set("user", user);

      let request = new Request("http://.../test", {
        headers: { Cookie: await sessionStorage.commitSession(session) },
      });

      let response = redirect("/dashboard");

      expect(
        new Authenticator(sessionStorage).isAuthenticated(request, {
          successRedirect: "/dashboard",
        })
      ).rejects.toEqual(response);
    });

    test("should accept headers as an option", async () => {
      let user = { id: "123" };
      let session = await sessionStorage.getSession();
      session.set("user", user);

      let request = new Request("http://.../test", {
        headers: { Cookie: await sessionStorage.commitSession(session) },
      });

      let response = redirect("/dashboard", {
        headers: { "X-Custom-Header": "true" },
      });

      expect(
        new Authenticator(sessionStorage).isAuthenticated(request, {
          successRedirect: "/dashboard",
          headers: { "X-Custom-Header": "true" },
        })
      ).rejects.toEqual(response);
    });
  });

  describe("authenticate", () => {
    test("should throw an error if throwOnError is enabled", async () => {
      let request = new Request("http://.../test");
      let authenticator = new Authenticator(sessionStorage);

      authenticator.use(new MockStrategy(async () => null));

      let error = await authenticator
        .authenticate("mock", request, {
          throwOnError: true,
        })
        .catch((error) => error);

      expect(error).toEqual(new AuthorizationError("Invalid credentials"));

      expect((error as AuthorizationError).cause).toEqual(
        new TypeError("Invalid credentials")
      );
    });
  });
});
