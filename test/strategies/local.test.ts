import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { LocalStrategy } from "../../src/strategies";

describe(LocalStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the name `local`", () => {
    let strategy = new LocalStrategy({}, verify);
    expect(strategy.name).toBe("local");
  });

  test("should redirect to the login URL if username is missing", async () => {
    let strategy = new LocalStrategy({}, verify);

    let body = new FormData();
    body.set("password", "pass");

    let request = new Request("http://example.com/login", {
      method: "POST",
      body,
    });

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

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:error")).toStrictEqual({
        message: "Username is required.",
      });
    }
  });

  test("should redirect to the login URL if password is missing", async () => {
    let strategy = new LocalStrategy({}, verify);

    let body = new FormData();
    body.set("username", "user");

    let request = new Request("http://example.com/login", {
      method: "POST",
      body,
    });

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

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:error")).toStrictEqual({
        message: "Password is required.",
      });
    }
  });

  test("should redirect to the login URL if password and password are missing", async () => {
    let strategy = new LocalStrategy({}, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new FormData(),
    });

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

      expect(error).toHaveStatus(302);
      expect(error).toRedirect("/login");
      expect(session.get("auth:error")).toStrictEqual({
        message: "Username and password are required.",
      });
    }
  });

  test("should call the verify function with the username and password", async () => {
    let strategy = new LocalStrategy({}, verify);

    let body = new FormData();
    body.set("username", "user");
    body.set("password", "pass");

    let request = new Request("http://example.com/login", {
      method: "POST",
      body,
    });

    await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

    expect(verify).toHaveBeenCalledWith({ username: "user", password: "pass" });
  });

  test("should return the result of the verify function", async () => {
    let strategy = new LocalStrategy({}, verify);

    let body = new FormData();
    body.set("username", "user");
    body.set("password", "pass");

    let request = new Request("http://example.com/login", {
      method: "POST",
      body,
    });

    verify.mockResolvedValueOnce({ username: "user" });

    let user = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

    expect(user).toEqual({ username: "user" });
  });

  test("should return a response with a cookie containing the result of verify if redirectTo is passed to authenticate", async () => {
    let strategy = new LocalStrategy({}, verify);

    let body = new FormData();
    body.set("username", "user");
    body.set("password", "pass");

    let request = new Request("http://example.com/login", {
      method: "POST",
      body,
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
    let strategy = new LocalStrategy({}, verify);
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
      expect(session.get("auth:error")).toEqual({
        message: "Invalid credentials.",
      });
    }
  });
});
