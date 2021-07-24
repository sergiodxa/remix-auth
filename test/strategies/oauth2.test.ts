import { createCookieSessionStorage, Request } from "@remix-run/node";
import fetchMock from "jest-fetch-mock";
import { OAuth2Strategy } from "../../src";

describe(OAuth2Strategy, () => {
  let verify = jest.fn();
  let callback = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  let options = Object.freeze({
    authorizationURL: "https://remix.run/authorize",
    tokenURL: "https://remix.run/token",
    clientID: "MY_CLIENT_ID",
    clientSecret: "MY_CLIENT_SECRET",
    callbackURL: "https://example.com/callback",
  });

  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
  });

  test("should have the name `basic`", () => {
    let strategy = new OAuth2Strategy(options, verify);
    expect(strategy.name).toBe("oauth2");
  });

  test("if user is already in the session redirect to `/`", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    session.set("user", user);
    let request = new Request("https://example.com/login", {
      headers: { cookie: await sessionStorage.commitSession(session) },
    });
    let response = await strategy.authenticate(request, sessionStorage);
    expect(response).toRedirect("/");
  });

  test("if user is already in the session run the callback", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    session.set("user", user);
    let request = new Request("https://example.com/login", {
      headers: { cookie: await sessionStorage.commitSession(session) },
    });
    await strategy.authenticate(request, sessionStorage, callback);
    expect(callback).toHaveBeenLastCalledWith(user);
  });

  test("should redirect to authorization if request is not the callback", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let request = new Request("https://example.com/login");
    let response = await strategy.authenticate(request, sessionStorage);
    let redirect = new URL(response.headers.get("Location") as string);
    let session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );

    expect(response).toRedirect();

    expect(redirect.pathname).toBe("/authorize");
    expect(redirect.searchParams.get("response_type")).toBe("code");
    expect(redirect.searchParams.get("client_id")).toBe(options.clientID);
    expect(redirect.searchParams.get("redirect_uri")).toBe(options.callbackURL);
    expect(redirect.searchParams.has("state")).toBeTruthy();

    expect(session.get("oauth2:state")).toBe(
      redirect.searchParams.get("state")
    );
  });

  test("should throw if state is not on the callback URL params", () => {
    let strategy = new OAuth2Strategy(options, verify);
    let request = new Request("https://example.com/callback");
    expect(strategy.authenticate(request, sessionStorage)).rejects.toThrow(
      "Missing state."
    );
  });

  test("should throw if the state in params doesn't match the state in session", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");
    let request = new Request(
      "https://example.com/callback?state=another-state",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );
    expect(strategy.authenticate(request, sessionStorage)).rejects.toThrow(
      "State doesn't match."
    );
  });

  test("should throw if code is not on the callback URL params", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");
    let request = new Request(
      "https://example.com/callback?state=random-state",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );
    expect(strategy.authenticate(request, sessionStorage)).rejects.toThrow(
      "Missing code."
    );
  });

  test("should call verify with the access token, refresh token, extra params and user profile", async () => {
    let strategy = new OAuth2Strategy(options, verify);
    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");
    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );

    fetchMock.once(
      JSON.stringify({
        access_token: "random-access-token",
        refresh_token: "random-refresh-token",
        id_token: "random.id.token",
      })
    );

    await strategy.authenticate(request, sessionStorage, callback);

    let [url, mockRequest] = fetchMock.mock.calls[0];
    let body = mockRequest?.body as URLSearchParams;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let headers = mockRequest?.headers as any;

    expect(url).toBe(options.tokenURL);

    expect(mockRequest?.method as string).toBe("POST");
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");

    expect(body.get("client_id")).toBe(options.clientID);
    expect(body.get("client_secret")).toBe(options.clientSecret);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("random-code");

    expect(verify).toHaveBeenLastCalledWith(
      "random-access-token",
      "random-refresh-token",
      { id_token: "random.id.token" },
      { provider: "oauth2" }
    );
  });

  test("should call the callback with the result of verify", async () => {
    let user = { id: "123" };
    verify.mockResolvedValueOnce(user);

    let strategy = new OAuth2Strategy(options, verify);

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );

    fetchMock.once(
      JSON.stringify({
        access_token: "random-access-token",
        refresh_token: "random-refresh-token",
        id_token: "random.id.token",
      })
    );

    await strategy.authenticate(request, sessionStorage, callback);

    expect(callback).toHaveBeenLastCalledWith(user);
  });

  test("should return a response with user in session and redirect to /", async () => {
    let user = { id: "123" };
    verify.mockResolvedValueOnce(user);

    let strategy = new OAuth2Strategy(options, verify);

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=random-state&code=random-code",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );

    fetchMock.once(
      JSON.stringify({
        access_token: "random-access-token",
        refresh_token: "random-refresh-token",
        id_token: "random.id.token",
      })
    );

    let response = await strategy.authenticate(request, sessionStorage);

    session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")
    );

    expect(response).toRedirect("/");
    expect(session.get("user")).toEqual(user);
  });
});
