import fetchMock, { enableFetchMocks } from "jest-fetch-mock";
import { createCookieSessionStorage, json } from "remix";
import { OAuth2Profile, OAuth2Strategy } from "../../src";

enableFetchMocks();

describe(OAuth2Strategy, () => {
  let verify = jest.fn();
  let callback = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  let options = Object.freeze({
    authorizationURL: "https://example.app/authorize",
    tokenURL: "https://example.app/token",
    clientID: "MY_CLIENT_ID",
    clientSecret: "MY_CLIENT_SECRET",
    callbackURL: "https://example.com/callback",
  });

  interface User {
    id: string;
  }
  interface TestProfile extends OAuth2Profile {
    provider: "oauth2";
  }

  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock.resetMocks();
  });

  test("should have the name `oauth2`", () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);
    expect(strategy.name).toBe("oauth2");
  });

  test("if user is already in the session redirect to `/`", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

    let session = await sessionStorage.getSession();
    session.set("user", { id: "123" });

    let request = new Request("https://example.com/login", {
      headers: { cookie: await sessionStorage.commitSession(session) },
    });

    let user = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

    expect(user).toEqual({ id: "123" });
  });

  test("if user is already in the session and successRedirect is set throw a redirect", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

    let session = await sessionStorage.getSession();
    session.set("user", { id: "123" } as User);

    let request = new Request("https://example.com/login", {
      headers: { cookie: await sessionStorage.commitSession(session) },
    });

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
        successRedirect: "/dashboar",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      expect(error.headers.get("Location")).toBe("/dashboar");
    }
  });

  test("should redirect to authorization if request is not the callback", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

    let request = new Request("https://example.com/login");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      let redirect = new URL(error.headers.get("Location") as string);

      let session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      expect(error).toRedirect();

      expect(redirect.pathname).toBe("/authorize");
      expect(redirect.searchParams.get("response_type")).toBe("code");
      expect(redirect.searchParams.get("client_id")).toBe(options.clientID);
      expect(redirect.searchParams.get("redirect_uri")).toBe(
        options.callbackURL
      );
      expect(redirect.searchParams.has("state")).toBeTruthy();

      expect(session.get("oauth2:state")).toBe(
        redirect.searchParams.get("state")
      );
    }
  });

  test("should throw if state is not on the callback URL params", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);
    let request = new Request("https://example.com/callback");
    let response = json({ message: "Missing state." }, { status: 400 });

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      expect(error).toEqual(response);
    }
  });

  test("should throw if the state in params doesn't match the state in session", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");

    let request = new Request(
      "https://example.com/callback?state=another-state",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );
    let response = json({ message: "State doesn't match." }, { status: 400 });

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      expect(error).toEqual(response);
    }
  });

  test("should throw if code is not on the callback URL params", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);
    let session = await sessionStorage.getSession();
    session.set("oauth2:state", "random-state");
    let request = new Request(
      "https://example.com/callback?state=random-state",
      {
        headers: { cookie: await sessionStorage.commitSession(session) },
      }
    );
    let response = json({ message: "Missing code." }, { status: 400 });
    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      expect(error).toEqual(response);
    }
  });

  test("should call verify with the access token, refresh token, extra params and user profile", async () => {
    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);
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

    await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

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

  test("should return the result of verify", async () => {
    let user = { id: "123" };
    verify.mockResolvedValueOnce(user);

    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

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

    let response = await strategy.authenticate(request, sessionStorage, {
      sessionKey: "user",
    });

    expect(response).toEqual(user);
  });

  test("should throw a response with user in session and redirect to /", async () => {
    let user = { id: "123" };
    verify.mockResolvedValueOnce(user);

    let strategy = new OAuth2Strategy<User, TestProfile>(options, verify);

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

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
        successRedirect: "/",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      session = await sessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      expect(error).toRedirect("/");
      expect(session.get("user")).toEqual(user);
    }
  });
});
