import { createCookieSessionStorage, Request } from "@remix-run/node";
import { BasicStrategy } from "../../src";

describe(BasicStrategy, () => {
  let callback = jest.fn();
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the name `basic`", () => {
    let strategy = new BasicStrategy(jest.fn());
    expect(strategy.name).toBe("basic");
  });

  test("should throw an error if callback is not defined", () => {
    let request = new Request("/auth/basic");
    let strategy = new BasicStrategy(verify);
    expect(
      strategy.authenticate(request, sessionStorage, { sessionKey: "user" })
    ).rejects.toThrow(
      "The authenticate callback on BasicStrategy is required."
    );
  });

  test("should return a 401 if Authorization was not set", async () => {
    let request = new Request("/auth/basic");
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(await response.text()).toBe("Missing Authorization header");
    expect(response).toHaveHeader("WWW-Authenticate", 'Basic realm="Users"');
  });

  test("should return 401 if Authorization is invalid", async () => {
    let request = new Request("/auth/basic", {
      headers: { Authorization: "invalid" },
    });
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(await response.text()).toBe("Invalid Authorization value");
    expect(response).toHaveHeader("WWW-Authenticate", 'Basic realm="Users"');
  });

  test("should return 401 if Authorization scheme is invalid", async () => {
    let request = new Request("/auth/basic", {
      headers: { Authorization: "Invalid scheme" },
    });
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(await response.text()).toBe("Invalid Authorization scheme");
    expect(response).toHaveHeader("WWW-Authenticate", 'Basic realm="Users"');
  });

  test("should return 401 if Authorization doesn't have user ID or password", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("credentials").toString("base64")}`,
      },
    });
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(await response.text()).toBe("Missing user ID or password");
    expect(response).toHaveHeader("WWW-Authenticate", 'Basic realm="Users"');
  });

  test("should call verify with user ID and password", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let strategy = new BasicStrategy(verify);
    await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(verify).toHaveBeenCalledWith("user", "pass");
  });

  test("should call callback with verify result", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let user = { name: "user" };
    verify.mockResolvedValueOnce(user);
    let strategy = new BasicStrategy(verify);
    await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(callback).toHaveBeenCalledWith(user);
  });

  test("should return a response after authenticate", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    callback.mockResolvedValueOnce(new Response(""));
    let user = { name: "user" };
    verify.mockResolvedValueOnce(user);
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(200);
  });

  test("should allow passing options to change the Realm", async () => {
    let request = new Request("/auth/basic");
    let strategy = new BasicStrategy({ realm: "Test" }, verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(response).toHaveHeader("WWW-Authenticate", 'Basic realm="Test"');
  });

  test("should return 401 if verify was rejected", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let error = new Error("User not found");
    verify.mockRejectedValueOnce(error);
    let strategy = new BasicStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toHaveStatus(401);
    expect(await response.text()).toBe("User not found");
  });
});
