import { createCookieSessionStorage } from "remix";
import { Authenticator, MockStrategy } from "../src";

describe(Authenticator, () => {
  let sessionStorage = createCookieSessionStorage({
    cookie: { secrets: ["s3cr3t"] },
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("isAuthenticated should return the user if it's on the session", async () => {
    let user = { id: "123" };
    let session = await sessionStorage.getSession();
    session.set("user", user);

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    expect(
      new Authenticator(sessionStorage, { sessionKey: "user" }).isAuthenticated(
        request
      )
    ).resolves.toEqual(user);
  });

  test("isAuthenticated should return null if user isn't on the session", async () => {
    let request = new Request("/");

    expect(
      new Authenticator(sessionStorage).isAuthenticated(request)
    ).resolves.toEqual(null);
  });

  test("should be able to add a new strategy calling use", async () => {
    let request = new Request("/");
    let response = new Response("It works!", {
      url: "/",
    });

    let authenticator = new Authenticator(sessionStorage);

    expect(authenticator.use(new MockStrategy(response))).toBe(authenticator);
    expect(await authenticator.authenticate("mock", request)).toEqual(response);
  });

  test("should be able to remove a strategy calling unuse", async () => {
    let response = new Response("It works!");

    let authenticator = new Authenticator(sessionStorage);
    authenticator.use(new MockStrategy(response));

    expect(authenticator.unuse("mock")).toBe(authenticator);
  });

  test("should throw if the strategy was not found", async () => {
    let request = new Request("/");
    let authenticator = new Authenticator(sessionStorage);

    expect(() => authenticator.authenticate("unknown", request)).toThrow(
      "Strategy unknown not found."
    );
  });
});
