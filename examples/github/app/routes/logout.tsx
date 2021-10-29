import { ActionFunction, json, LoaderFunction, redirect } from "remix";
import { destroySession, getSession } from "~/services/session.server";

export let action: ActionFunction = async ({ request }) => {
  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(await getSession(request)),
    },
  });
};

export let loader: LoaderFunction = () => {
  throw json({}, { status: 404 });
};
