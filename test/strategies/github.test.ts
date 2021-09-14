import { createCookieSessionStorage, Request } from "remix";
import { GitHubStrategy } from "../../src";

describe(GitHubStrategy, () => {
  let callback = jest.fn();
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should allow changing the scope", async () => {
    let strategy = new GitHubStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        scope: "custom",
      },
      verify
    );

    let request = new Request("https://example.app/auth/github");

    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );

    let location = response.headers.get("Location");

    if (!location) throw new Error("No redirect header");

    let redirectUrl = new URL(location);

    expect(redirectUrl.searchParams.get("scope")).toBe("custom");
  });

  test("should have the scope `email` as default", async () => {
    let strategy = new GitHubStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
      },
      verify
    );

    let request = new Request("https://example.app/auth/github");

    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );

    let location = response.headers.get("Location");

    if (!location) throw new Error("No redirect header");

    let redirectUrl = new URL(location);

    expect(redirectUrl.searchParams.get("scope")).toBe("email");
  });

  test("should correctly format the authorization URL", async () => {
    let strategy = new GitHubStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
      },
      verify
    );

    let request = new Request("https://example.app/auth/github");

    let response = await strategy.authenticate(
      request,
      sessionStorage,
      { sessionKey: "user" },
      callback
    );

    let location = response.headers.get("Location");

    if (!location) throw new Error("No redirect header");

    let redirectUrl = new URL(location);

    expect(redirectUrl.hostname).toBe("github.com");
    expect(redirectUrl.pathname).toBe("/login/oauth/authorize");
  });
});
