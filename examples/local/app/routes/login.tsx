import { ActionFunction, LoaderFunction, redirect } from "remix";
import { authenticator } from "../auth";
import { getSession } from "../session";

export let action: ActionFunction = async ({ request }) => {
  return authenticator.authenticate("local", request, async (user) => {
    let session = await getSession(request);
    session.set(authenticator.sessionKey, user);
    return redirect("/");
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request);
  if (user) return redirect("/");
  return {};
};

export default function Login() {
  return (
    <form method="post">
      <div>
        <label>Email</label>
        <input type="email" name="email" required />
      </div>
      <div>
        <label>Password</label>
        <input type="password" name="password" required />
      </div>
    </form>
  );
}
