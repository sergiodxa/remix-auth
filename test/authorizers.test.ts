import {
  createCookieSessionStorage,
  json,
  LoaderFunction,
} from "@remix-run/server-runtime";
import { Authenticator, Authorizer } from "../src";

describe(Authorizer, () => {
  test("it should work", async () => {
    type User = {
      id: number;
      token: string;
      email: string;
      role: string;
    };

    let sessionStorage = createCookieSessionStorage({
      cookie: { name: "session", secrets: ["s3cr3ts"], path: "/" },
    });

    let authenticator = new Authenticator<User>(sessionStorage);

    let authorizer = new Authorizer<User, string>(authenticator, [
      async function isAdmin({ user }) {
        return user.role === "admin";
      },
      // async function ipRestriction({ request }) {
      //   return request.headers.get("GET-IP-SOMEHOW") === "127.0.0.1";
      // },
      // async function worktimeOnly() {
      //   let date = new Date();
      //   if (date.getHours() < 8 || date.getHours() > 17) return false;
      //   return true;
      // },
      // async function commentOwner({ user, params, data }) {
      //   let comment = await getComment(params.id);
      //   return comment.authorId === user.id;
      // },
    ]);

    let user: User = {
      id: 1,
      token: "token",
      email: "test@example.com",
      role: "admin",
    };

    let session = await sessionStorage.getSession();
    session.set(authenticator.sessionKey, user);

    let loader: LoaderFunction = async (args) => {
      let user = await authorizer.authorize({ ...args });
      return json({ user });
    };

    let request = new Request("/", {
      headers: { Cookie: await sessionStorage.commitSession(session) },
    });

    let response = await loader({ request, params: { id: "1" }, context: {} });

    let body = await response.json();

    expect(body.user).toEqual(user);
  });
});
