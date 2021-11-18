import { createCookieSessionStorage } from "@remix-run/server-runtime";
import { ShopifyStrategy } from "../../src";

describe(ShopifyStrategy, () => {
  let verify = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should allow changing the scope", async () => {
    let strategy = new ShopifyStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        shop: "my-shop.com",
        scopes: "custom",
        accessMode: "per-user",
      },
      verify
    );

    let request = new Request("https://example.app/auth/github");

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

  test("should correctly format the authorization URL", async () => {
    let strategy = new ShopifyStrategy(
      {
        clientID: "CLIENT_ID",
        clientSecret: "CLIENT_SECRET",
        callbackURL: "https://example.app/callback",
        shop: "my-shop.com",
        scopes: "custom",
        accessMode: "per-user",
      },
      verify
    );

    let request = new Request("https://example.app/auth/github");

    try {
      await strategy.authenticate(request, sessionStorage, {
        sessionKey: "user",
      });
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      let location = error.headers.get("Location");

      if (!location) throw new Error("No redirect header");

      let redirectUrl = new URL(location);

      expect(redirectUrl.hostname).toBe("my-shop.com");
      expect(redirectUrl.pathname).toBe("/admin/oauth/authorize");
      expect(redirectUrl.searchParams.get("scope")).toBe("custom");
      expect(redirectUrl.searchParams.get("grant_mode[]")).toBe("per-user");
    }
  });
});
