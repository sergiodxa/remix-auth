import { createCookieSessionStorage, Request } from "@remix-run/node";
import { LocalStrategy } from "../../src";

describe(LocalStrategy, () => {
  let verify = jest.fn();
  let callback = jest.fn();
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

  test("should throw an error if request URL is not login URL", () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/random");
    expect(strategy.authenticate(request, sessionStorage)).rejects.toThrow(
      "The authenticate method with LocalStrategy can only be used on the login URL."
    );
  });

  test("should throw an error if request method is not POST", () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", { method: "GET" });
    expect(strategy.authenticate(request, sessionStorage)).rejects.toThrow(
      "The authenticate method with LocalStrategy can only be used on action functions."
    );
  });

  test("should redirect to the login URL if username is missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ password: "pass" }),
    });
    let response = await strategy.authenticate(request, sessionStorage);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );
    expect(response).toHaveStatus(302);
    expect(response).toRedirect("/login");
    expect(session.get("auth:local:error:user")).toBe("Missing username.");
  });

  test("should redirect to the login URL if password is missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user" }),
    });
    let response = await strategy.authenticate(request, sessionStorage);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );
    expect(response).toHaveStatus(302);
    expect(response).toRedirect("/login");
    expect(session.get("auth:local:error:pass")).toBe("Missing password.");
  });

  test("should redirect to the login URL if password and password are missing", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams(),
    });
    let response = await strategy.authenticate(request, sessionStorage);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );
    expect(response).toHaveStatus(302);
    expect(response).toRedirect("/login");
    expect(session.get("auth:local:error:user")).toBe("Missing username.");
    expect(session.get("auth:local:error:pass")).toBe("Missing password.");
  });

  test("should call the verify function with the username and password", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    await strategy.authenticate(request, sessionStorage);
    expect(verify).toHaveBeenCalledWith("user", "pass");
  });

  test("should call the callback with the result of the verify function and expect a Response as result of authenticate", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    let user = { username: "user" };
    verify.mockResolvedValueOnce(user);
    callback.mockResolvedValueOnce(new Response("Test"));
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      callback
    );
    expect(callback).toHaveBeenCalledWith(user);
    expect(response).toBeInstanceOf(Response);
    expect(await response.text()).toBe("Test");
  });

  test("should return a response with a cookie containing the result of verify if callback is not passed to authenticate", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    let user = { username: "user" };
    verify.mockResolvedValueOnce(user);
    let response = await strategy.authenticate(request, sessionStorage);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );
    expect(response).toRedirect("/");
    expect(session.get("user")).toEqual(user);
  });

  test("should redirect to login URL with a flash message if verify was rejected", async () => {
    let strategy = new LocalStrategy({ loginURL: "/login" }, verify);
    let request = new Request("http://example.com/login", {
      method: "POST",
      body: new URLSearchParams({ username: "user", password: "pass" }),
    });
    verify.mockRejectedValueOnce(new Error("Invalid credentials."));
    let response = await strategy.authenticate(request, sessionStorage);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );
    expect(response).toRedirect("/login");
    expect(session.get("auth:local:error")).toBe("Invalid credentials.");
  });
});
