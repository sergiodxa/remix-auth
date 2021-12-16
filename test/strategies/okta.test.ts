import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { OktaStrategy } from "../../src";

describe(OktaStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should allow changing the scope", async () => {
    let strategy = new OktaStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        issuer: "https://my-domain.okta.com/oauth2/default",
        scope: "custom",
      },
      verify
    );

    let request = new Request("https://example.app/auth/okta");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe("custom");
    }
  });

  test("should have the scope `openid profile email` as default", async () => {
    let strategy = new OktaStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        issuer: "https://my-domain.okta.com/oauth2/default",
      },
      verify
    );

    let request = new Request("https://example.app/auth/okta");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;
      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.searchParams.get("scope")).toBe(
        "openid profile email"
      );
    }
  });

  test("should correctly format the authorization URL", async () => {
    let strategy = new OktaStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        issuer: "https://my-domain.okta.com/oauth2/default",
      },
      verify
    );

    let request = new Request("https://example.app/auth/okta");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.hostname).toBe("my-domain.okta.com");
      expect(redirectUrl.pathname).toBe("/oauth2/default/v1/authorize");
    }
  });
});
