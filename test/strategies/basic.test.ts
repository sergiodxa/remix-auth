import { BasicStrategy } from "../../src/strategies";

async function testRaisedError(promise: Promise<unknown>, message: string) {
  try {
    await promise;
  } catch (error) {
    if (!(error instanceof Response)) throw error;
    expect(error).toHaveStatus(401);
    expect(error).toHaveHeader("WWW-Authenticate", 'Basic realm="Users"');
    expect(await error.json()).toEqual({ message });
  }
}

describe(BasicStrategy, () => {
  let verify = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the name `basic`", () => {
    let strategy = new BasicStrategy({}, jest.fn());
    expect(strategy.name).toBe("basic");
  });

  test("should throw a 401 if Authorization was not set", async () => {
    let request = new Request("/auth/basic");
    let strategy = new BasicStrategy({}, verify);

    await testRaisedError(
      strategy.authenticate(request),
      "Missing Authorization header."
    );
  });

  test("should return 401 if Authorization is invalid", async () => {
    let request = new Request("/auth/basic", {
      headers: { Authorization: "invalid" },
    });
    let strategy = new BasicStrategy({}, verify);
    await testRaisedError(
      strategy.authenticate(request),
      "Invalid Authorization value."
    );
  });

  test("should return 401 if Authorization scheme is invalid", async () => {
    let request = new Request("/auth/basic", {
      headers: { Authorization: "Invalid scheme" },
    });
    let strategy = new BasicStrategy({}, verify);
    await testRaisedError(
      strategy.authenticate(request),
      "Invalid Authorization scheme."
    );
  });

  test("should return 401 if Authorization doesn't have user ID or password", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("credentials").toString("base64")}`,
      },
    });
    let strategy = new BasicStrategy({}, verify);
    await testRaisedError(
      strategy.authenticate(request),
      "Missing user ID or password."
    );
  });

  test("should call verify with user ID and password", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let strategy = new BasicStrategy({}, verify);
    await strategy.authenticate(request);
    expect(verify).toHaveBeenCalledWith({ userId: "user", password: "pass" });
  });

  test("should return with verify result", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let user = { name: "user" };
    verify.mockResolvedValueOnce(user);
    let strategy = new BasicStrategy({}, verify);
    let result = await strategy.authenticate(request);
    expect(result).toEqual(user);
  });

  test.skip("should allow passing options to change the Realm", async () => {
    let request = new Request("/auth/basic");
    let strategy = new BasicStrategy({ realm: "Test" }, verify);
    try {
      await strategy.authenticate(request);
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      expect(error).toHaveStatus(401);
      expect(error).toHaveHeader("WWW-Authenticate", 'Basic realm="Test"');
    }
  });

  test("should return 401 if verify was rejected", async () => {
    let request = new Request("/auth/basic", {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    });
    let error = new Error("User not found");
    verify.mockRejectedValueOnce(error);
    let strategy = new BasicStrategy({}, verify);
    await testRaisedError(strategy.authenticate(request), "User not found");
  });
});
