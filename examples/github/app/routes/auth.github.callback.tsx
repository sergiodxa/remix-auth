import { LoaderFunction } from "remix";
import { authenticator } from "~/services/auth.server";

export let loader: LoaderFunction = async ({ request }) => {
  await authenticator.authenticate("github", request, {
    successRedirect: "/",
    failureRedirect: "/login",
  });
};
