import { Link, LoaderFunction, MetaFunction, useLoaderData } from "remix";
import { User } from "~/models/user";
import { authenticator } from "~/services/auth.server";

export let meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

export let loader: LoaderFunction = async ({ request }) => {
  let user = await authenticator.isAuthenticated(request);
  return { message: "this is awesome 😎", user };
};

export default function Index() {
  let data = useLoaderData<{ user: User; message: string }>();

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Welcome to Remix!</h2>
      <p>
        <a href="https://docs.remix.run">Check out the docs</a> to get started.
      </p>
      <p>Message from the loader: {data.message}</p>
      <p>
        <Link to="not-found">Link to 404 not found page.</Link> Clicking this
        link will land you in your root CatchBoundary component.
      </p>
      {!data.user && (
        <form action="/auth/login" method="post">
          <button>Login</button>
        </form>
      )}
      {data.user && (
        <>
          <p>{data.user.email}</p>
          <form action="/auth/logout" method="post">
            <button>Logout</button>
          </form>
        </>
      )}
    </div>
  );
}
