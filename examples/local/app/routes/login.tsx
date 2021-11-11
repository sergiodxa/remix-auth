import { ActionFunction, Form, LoaderFunction, redirect } from "remix";
import { authenticator } from "~/services/auth";

export let action: ActionFunction = async ({ request }) => {
  return await authenticator.authenticate("local", request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};

export let loader: LoaderFunction = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request);
  if (user) return redirect("/");
  return {};
};

export default function Login() {
  return (
    <Form method="post">
      <div>
        <label>Email</label>
        <input
          type="email"
          name="email"
          required
          defaultValue="user@example.com"
        />
      </div>
      <div>
        <label>Password</label>
        <input type="password" name="password" required defaultValue="abc123" />
      </div>
      <button>Login</button>
    </Form>
  );
}
