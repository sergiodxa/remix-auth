import {
  Form,
  Link,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  useLoaderData,
} from "remix";
import { User } from "~/models/user";
import { authenticator } from "~/services/auth.server";
import stylesUrl from "../styles/index.css";

export let meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
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
        <p>
          <Link to="login">Link to login page.</Link> Clicking this link will
          land you in the login page UI.
        </p>
      )}
      {data.user && (
        <Form action="/logout" method="post">
          <button>Logout</button>
        </Form>
      )}
    </div>
  );
}
