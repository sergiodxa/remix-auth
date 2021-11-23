import {
  createCookieSessionStorage,
  redirect,
} from "@remix-run/server-runtime";
import { Authenticator, KCDStrategy } from "../../src";

describe(KCDStrategy, () => {
  type User = { id: string; name: string };
  let verify = jest.fn();
  let sendEmail = jest.fn();
  let verifyEmailAddress = jest.fn();
  let secret = "s3cr3t";
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: [secret] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should throw if method is POST and successRedirect is not defined", () => {
    let auth = new Authenticator<User>(sessionStorage);
    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
      verify
    );
    auth.use(strategy);

    expect(
      auth.authenticate("kcd", new Request("/", { method: "POST" }))
    ).rejects.toThrow(
      "Missing successRedirect. The successRedirect is required for POST requests."
    );
  });

  describe("should throw if email address is not in the request body", () => {
    test("if failureRedirect is not defined throw an error", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      await expect(
        auth.authenticate("kcd", new Request("/login", { method: "POST" }), {
          successRedirect: "/me",
        })
      ).rejects.toThrow("Missing email address.");
    });

    test("if failureRedirect is defined throw a redirect", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Missing email address.");

      await expect(
        auth.authenticate("kcd", new Request("/login", { method: "POST" }), {
          successRedirect: "/me",
          failureRedirect: "/login",
        })
      ).rejects.toEqual(
        redirect("/login", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );
    });
  });

  describe("should throw if validateEmail is rejected", () => {
    test("if failureRedirect is not defined throw an error", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verifyEmailAddress.mockRejectedValueOnce(
        new Error("Email address is disposable.")
      );

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
          }),
          { successRedirect: "/me" }
        )
      ).rejects.toThrow("Email address is disposable.");
    });

    test("if failureRedirect is defined throw a redirect", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verifyEmailAddress.mockRejectedValueOnce(
        new Error("Email address is disposable.")
      );

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Email address is disposable.");

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
          }),
          {
            successRedirect: "/me",
            failureRedirect: "/login",
          }
        )
      ).rejects.toEqual(
        redirect("/login", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );
    });
  });

  describe("should throw if the host is not defined in the headers", () => {
    test("if failureRedirect is not defined throw an error", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verifyEmailAddress.mockResolvedValueOnce(true);

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Could not determine domain URL.");

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
          }),
          {
            successRedirect: "/me",
            failureRedirect: "/login",
          }
        )
      ).rejects.toEqual(
        redirect("/login", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );
    });

    test("if failureRedirect is defined throw a redirect", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verifyEmailAddress.mockResolvedValueOnce(true);

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Could not determine domain URL.");

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
          }),
          {
            successRedirect: "/me",
            failureRedirect: "/login",
          }
        )
      ).rejects.toEqual(
        redirect("/login", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );
    });
  });

  describe("should throw if sendEmail failed", () => {
    test("if failureRedirect is not defined throw an error", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verify.mockResolvedValueOnce({ id: "123", name: "John Doe" } as User);
      sendEmail.mockRejectedValueOnce(new Error("Failed to send the email."));

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Failed to send the email.");

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
            headers: { Host: "localhost:3000" },
          }),
          {
            successRedirect: "/me",
          }
        )
      ).rejects.toThrow("Failed to send the email.");

      expect(verify).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    test("if failureRedirect is defined throw a redirect", async () => {
      let auth = new Authenticator<User>(sessionStorage);
      let strategy = new KCDStrategy<User>(
        { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
        verify
      );
      auth.use(strategy);

      verify.mockResolvedValueOnce({ id: "123", name: "John Doe" } as User);
      sendEmail.mockRejectedValueOnce(new Error("Failed to send the email."));

      let session = await sessionStorage.getSession();
      session.flash("kcd:error", "Failed to send the email.");

      await expect(
        auth.authenticate(
          "kcd",
          new Request("/login", {
            method: "POST",
            body: new URLSearchParams({ email: "user@example.com" }),
            headers: { Host: "localhost:3000" },
          }),
          {
            successRedirect: "/me",
            failureRedirect: "/login",
          }
        )
      ).rejects.toEqual(
        redirect("/login", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );

      expect(verify).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  test("Happy path flow", async () => {
    let auth = new Authenticator<User>(sessionStorage);
    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", verifyEmailAddress, secret },
      verify
    );
    auth.use(strategy);

    let user: User = { id: "123", name: "John Doe" };

    verify.mockResolvedValue(user);
    sendEmail.mockResolvedValueOnce(null);

    try {
      await auth.authenticate(
        "kcd",
        new Request("/login", {
          method: "POST",
          body: new URLSearchParams({ email: "user@example.com" }),
          headers: { "X-Forwarded-Host": "localhost:3000" },
        }),
        {
          successRedirect: "/me",
          failureRedirect: "/login",
        }
      );
    } catch (error) {
      if (!(error instanceof Response)) throw error;

      expect(error).toRedirect("/login");
      expect(error).toHaveHeader("Set-Cookie");

      let cookie = error.headers.get("Set-Cookie");

      let session = await sessionStorage.getSession(cookie);
      // @ts-expect-error this method is marked as private but we need it here
      let magicLink = strategy.decrypt(session.get("kcd:magiclink"));

      session.unset("kcd:magiclink");
      session.set(auth.sessionKey, user);

      await expect(
        auth.authenticate(
          "kcd",
          new Request(magicLink, { headers: { cookie } }),
          { successRedirect: "/me", failureRedirect: "/login" }
        )
      ).rejects.toEqual(
        redirect("/me", {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        })
      );
    }
  });
});
