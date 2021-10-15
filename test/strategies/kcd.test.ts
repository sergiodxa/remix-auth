import { createCookieSessionStorage, redirect } from "remix";
import { Authenticator, KCDStrategy } from "../../src";

describe(KCDStrategy, () => {
  type User = { id: string; name: string };
  let verify = jest.fn();
  let sendEmail = jest.fn();
  let validateEmail = jest.fn();
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  let auth = new Authenticator<User>(sessionStorage);

  beforeEach(() => {
    auth.unuse("kcd");
  });

  test("should throw if method is POST and successRedirect is not defined", () => {
    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", validateEmail, secret: "s3cr3t" },
      verify
    );

    auth.use(strategy);

    let request = new Request("/", { method: "POST" });

    expect(auth.authenticate("kcd", request)).rejects.toThrow(
      "Missing successRedirect. The successRedirect is required for POST requests."
    );
  });

  test("should throw if email address is not in the request body", () => {
    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", validateEmail, secret: "s3cr3t" },
      verify
    );

    auth.use(strategy);

    let request = new Request("/", { method: "POST" });

    expect(
      auth.authenticate("kcd", request, { successRedirect: "/me" })
    ).rejects.toThrow("Missing email address.");
  });

  test("should throw a redirect to failureRedirect if email address is not in the request body and failureRedirect is defined", async () => {
    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", validateEmail, secret: "s3cr3t" },
      verify
    );

    auth.use(strategy);

    let request = new Request("/", { method: "POST" });

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

    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", validateEmail, secret: "s3cr3t" },
      verify
    );

    auth.use(strategy);

    let request = new Request("/", {
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

    let strategy = new KCDStrategy<User>(
      { sendEmail, callbackURL: "/magic", validateEmail, secret: "s3cr3t" },
      verify
    );

    auth.use(strategy);

    let request = new Request("/", {
      method: "POST",
      body: new URLSearchParams({ email: "user@example.com" }),
    });

    let session = await sessionStorage.getSession();
    session.flash(strategy.sessionErrorKey, "Email address is disposable.");

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
});
