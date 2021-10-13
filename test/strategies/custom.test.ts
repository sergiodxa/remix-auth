import { createCookieSessionStorage } from "remix";
import { CustomStrategy } from "../../src";

describe(CustomStrategy, () => {
  let verify = jest.fn();
  let request = new Request("/auth/custom");
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have the name `custom`", () => {
    let strategy = new CustomStrategy(jest.fn());
    expect(strategy.name).toBe("custom");
  });

  test("should call the verify callback with the request, session storage and options", async () => {
    let strategy = new CustomStrategy(verify);
    await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });
    expect(verify).toHaveBeenCalledWith(request, sessionStorage, {
      sessionKey: "user",
    });
  });

  test("should return the verify result from authenticate", async () => {
    verify.mockResolvedValueOnce({ id: "123" });
    let strategy = new CustomStrategy(verify);
    let response = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });
    expect(response).toEqual({ id: "123" });
  });

  test("should throw if verify raise an error", async () => {
    verify.mockRejectedValueOnce(new Error("Something failed."));
    let strategy = new CustomStrategy(verify);
    await expect(
      strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      })
    ).rejects.toThrow("Something failed.");
  });
});
