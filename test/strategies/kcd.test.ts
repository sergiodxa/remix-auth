import { createCookieSessionStorage, redirect } from "remix";
import { Authenticator, KCDStrategy } from "../../src";

describe(KCDStrategy, () => {
  type User = { id: string; name: string };
  let verify = jest.fn();
  let sendEmail = jest.fn();
  let validateEmail = jest.fn();
  let secret = "s3cr3t";
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: [secret] },
  });
  let auth = new Authenticator<User>(sessionStorage);
  let strategy = new KCDStrategy<User>(
    {
      waitURL: "/login",
      sendEmail,
      callbackURL: "/magic",
      validateEmail,
      secret,
    },
    verify
  );

  beforeAll(() => {
    auth.use(strategy);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("should throw if email address is not in the request body", () => {
    let request = new Request("/login", { method: "POST" });

    expect(
      auth.authenticate("kcd", request, { successRedirect: "/me" })
    ).rejects.toThrow("Missing email address.");
  });

  test("should throw a redirect to failureRedirect if email address is not in the request body and failureRedirect is defined", async () => {
    let request = new Request("/login", { method: "POST" });

    let session = await sessionStorage.getSession();
    session.flash("kcd:error", "Missing email address.");

    let response = redirect("/login", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });

    expect(
      auth.authenticate("kcd", request, {
        successRedirect: "/me",
        failureRedirect: "/login",
      })
    ).rejects.toEqual(response);
  });

  test("should throw if validateEmail is rejected", () => {
    validateEmail.mockRejectedValueOnce(
      new Error("Email address is disposable.")
    );

    let request = new Request("/login", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
    });

    expect(
      auth.authenticate("kcd", request, { successRedirect: "/me" })
    ).rejects.toThrow("Email address is disposable.");
  });

  test("should throw a redirect if validateEmail is rejected and failureRedirect is defined", async () => {
    validateEmail.mockRejectedValueOnce(
      new Error("Email address is disposable.")
    );

    let request = new Request("/login", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
    });

    let session = await sessionStorage.getSession();
    session.flash("kcd:error", "Email address is disposable.");

    let response = redirect("/login", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });

    expect(
      auth.authenticate("kcd", request, {
        successRedirect: "/me",
        failureRedirect: "/login",
      })
    ).rejects.toEqual(response);
  });

  test("should throw if the host is not defined in the headers", async () => {
    validateEmail.mockResolvedValueOnce(true);

    let request = new Request("/login", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
    });

    let session = await sessionStorage.getSession();
    session.flash("kcd:error", "Could not determine domain URL.");

    let response = redirect("/login", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });

    expect(
      auth.authenticate("kcd", request, {
        successRedirect: "/me",
        failureRedirect: "/login",
      })
    ).rejects.toEqual(response);
  });

  test("should throw if sendEmail failed", async () => {
    verify.mockResolvedValueOnce({ id: "123", name: "John Doe" } as User);
    sendEmail.mockRejectedValueOnce(new Error("Failed to send the email."));

    let request = new Request("/login", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
      headers: { Host: "localhost:3000" },
    });

    let session = await sessionStorage.getSession();
    session.flash("kcd:error", "Failed to send the email.");

    await expect(
      auth.authenticate("kcd", request, {
        successRedirect: "/me",
      })
    ).rejects.toThrow("Failed to send the email.");

    expect(verify).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  test("should throw a redirect to failureRedirect if sendEmail failed", async () => {
    verify.mockResolvedValueOnce({ id: "123", name: "John Doe" } as User);
    sendEmail.mockRejectedValueOnce(new Error("Failed to send the email."));

    let request = new Request("/login", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
      headers: { "X-Forwarded-Host": "localhost:3000" },
    });

    let session = await sessionStorage.getSession();
    session.flash("kcd:error", "Failed to send the email.");

    let response = redirect("/login", {
      headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
    });

    await expect(
      auth.authenticate("kcd", request, {
        successRedirect: "/me",
        failureRedirect: "/login",
      })
    ).rejects.toEqual(response);

    expect(verify).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  test("Happy path flow", async () => {
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

      expect(
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
