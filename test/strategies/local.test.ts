import { createCookieSessionStorage, json } from "remix";
import { LocalStrategy } from "../../src";

describe(LocalStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the name `local`", () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    expect(strategy.name).toBe("local");
  });

  test("should throw a 400 if request URL is not login URL", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/random");
    let response = json(
      {
        message:
          "The authenticate method with LocalStrategy can only be used on the login URL.",
      },
      { status: 400 }
    );

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      expect(error).toEqual(response);
    }
  });

  test("should throw a 405 if request method is not POST", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", { method: "GET" });
    let response = json(
      {
        message:
          "The authenticate method with LocalStrategy can only be used on action functions.",
      },
      { status: 405 }
    );

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      expect(error).toEqual(response);
    }
  });

  test("should redirect to the login URL if username is missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ password: "pass" }),
    });
    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw new Error("Not a response");

      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:local:error:user")).toBe("Missing username.");
    }
  });

  test("should redirect to the login URL if password is missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user" }),
    });

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw new Error("Not a response");

      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:local:error:pass")).toBe("Missing password.");
    }
  });

  test("should redirect to the login URL if password and password are missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams(),
    });

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw new Error("Not a response");

      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:local:error:user")).toBe("Missing username.");
      expect(session.get("auth:local:error:pass")).toBe("Missing password.");
    }
  });

  test("should call the verify function with the username and password", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });
    expect(verify).toHaveBeenCalledWith("user", "pass");
  });

  test("should return the result of the verify function", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    verify.mockResolvedValueOnce({ username: "user" });
    let user = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });
    expect(user).toEqual({ username: "user" });
  });

  test("should return a response with a cookie containing the result of verify if redirectTo is passed to authenticate", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    let user = { username: "user" };
    verify.mockResolvedValueOnce(user);
    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
        successRedirect: "/",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw new Error("Not a response");
      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );
      expect(error).toRedirect("/");
      expect(session.get("user")).toEqual(user);
    }
  });

  test("should redirect to login URL with a flash message if verify was rejected", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    verify.mockRejectedValueOnce(new Error("Invalid credentials."));
    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
        failureRedirect: "/login",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw new Error("Not a response");

      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );
      expect(error).toRedirect("/login");
      expect(session.get("auth:local:error")).toEqual({
        message: "Invalid credentials.",
      });
    }
  });
});
