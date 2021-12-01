import { createCookieSessionStorage } from "@remix-run/server-runtime";

import { AppleStrategy } from "../../src";

describe(AppleStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should have no scope specified", async () => {
    let strategy = new AppleStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
      },
      verify
    );

    let request = new Request("https://example.app/auth/apple");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe(null);
    }
  });

  test("should have response mode query", async () => {
    let strategy = new AppleStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
      },
      verify
    );

    let request = new Request("https://example.app/auth/apple");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("response_mode")).toBe("query");
    }
  });

  test("should correctly format the authorization URL", async () => {
    let strategy = new AppleStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
      },
      verify
    );

    let request = new Request("https://example.app/auth/apple");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.hostname).toBe("appleid.apple.com");
      expect(redirectUrl.pathname).toBe("/auth/authorize");
    }
  });
});
