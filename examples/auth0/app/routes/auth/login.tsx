import { ActionFunction } from "remix";
import { authenticator } from "~/services/auth.server";

export let action: ActionFunction = async ({ request }) => {
  await authenticator.authenticate("auth0", request);
};
