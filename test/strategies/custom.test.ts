import { createCookieSessionStorage, Request, Response } from "@remix-run/node";
import { AuthenticateCallback, CustomStrategy } from "../../src";

describe(CustomStrategy, () => {
  let callback = jest.fn();
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
    await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(verify).toHaveBeenCalledWith(request, sessionStorage, {
      sessionKey: "user",
    });
    expect(callback).toHaveBeenCalled();
  });

  test("should return a response from authenticate", async () => {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    callback.mockImplementationOnce(async (response: Response) => response);
    verify.mockResolvedValueOnce(new Response("", { status: 200 }));
    let strategy = new CustomStrategy(verify);
    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );
    expect(response).toBeInstanceOf(Response);
  });

  test("should throw an error if callback is not defined", () => {
    let strategy = new CustomStrategy(verify);
    expect(
      strategy.authenticate(
        request,
        sessionStorage,
        { sessionKey: "user" },
        null as unknown as AuthenticateCallback<unknown>
      )
    ).rejects.toThrow(
      "The authenticate callback on CustomStrategy is required."
    );
  });
});
