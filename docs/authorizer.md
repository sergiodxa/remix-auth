# Authorizer

The Authorizer is Remix Auth's built in way to perform authorization on a per route basis. It uses rules that you provide to protect specific routes.

## Rules

A rule is a function that recieves the loader arguments (request, params, and optionally context), a `User` from the `Authenticator`, and optionally additional data.

A rule should return a promise resolving to a boolean value indicating whether or not the user is authorized. Throwing an error from within your rules will be an uncaught exception unless you catch it yourself.

You can create multiple rules for different scenarios and rules can either be global or related only to specific routes.

Both global and route specific rules are optional.

### Global Rules

Global rules are applied to the `Authenticator` instance when you create it (see [usage](#usage)). These rules are checked on every call to `authorize`.

### Route Specific Rules

Route specific rules are selectively applied each time you call `authorize`.

### Options for handling Unauthorized Users

The call to `authorize` accepts either the loader args or action args as its first argument and an options object as its second argument. The options are as follows:

```ts
  raise: "error" | "redirect" | "response",
  failureRedirect?: string,
  rules: RuleFunction<User, Data>[]
```

The `raise` option dictates the behavior when a user is unauthorized. "error" will throw an error, "response" will throw a json response with a message and a 401 status code, and "redirect" will redirect to the `failureRedirect` provided (if you select "redirect" you must provide a failureRedirect value).

The default value of `raise` is "response".

#### Error & Response Messages

If the user is not authenticated at all then the error message is "Not authenticated". If a specific rule indicates the user is unauthorized (by returning false) then the error message will be "Forbidden by policy {ruleName}" (with ruleName being the name of the rule function, or "Forbidden" if an arrow function is used).

## Setup

To use it you need to import it first, you may want to create it alongside the `Authenticator` instance or in a separate file that imports the `Authenticator` instance.

```ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/session.server";

type User = { id: string; name: string; email: string; onboarding: boolean };

export let authenticator = new Authenticator<User>(sessionStorage);

export let authorizer = new Authorizer(authenticator, [
  // This is a global rule, applied to every call to `authenticate`
  // Global rules are optional
  async function isOnboarded({ user }) {
    return user.onboarding;
  },
]);
```

You do not have to provide any global rules and the only check that the authorizer will perform is a call to `authenticator.isAuthenticated`.

The `User` type parameter provided to the Authenticator constructor defines the type of value of the `user` argument provided to each of your rule functions.

> The Authenticator constructor takes two type parameters Authenticator<User, Data>. You do not need to provide either, however if you provide a type for User you should also provide a type for Data otherwise it will be considered `unknown`.

## Usage

In any of your route files you can import the authorizer instance to use in a loader or action. If the user is authorized to access the route or perform the action then the call to `authorize` will return the user.

With only global rules (or no rules).

```ts
import { type LoaderArgs, json } from "@remix-run/node";
import { authorizer } from "~/auth.server"; // import our authorizer

export let loader: LoaderFunction = async (args: LoaderArgs) => {
  // authorize calls `authenticator.isAuthenticated` under the hood
  let user = await authorizer.authorize(args);
  // At this point we know the user is authorized based on the global rules
  return json({});
};
```

With a route specific rule (and all global rules if they exist)

```ts
export let loader: LoaderFunction = async (args: LoaderArgs) => {
  //
  let user = await authorizer.authorize(args, {
    rules: [
      async function isNotAdmin({ user }) {
        return user.role !== "admin";
      },
    ],
  });
  // At this point we know the user is authorized based on the global rules and the route specific rule applied above
  return json({});
};
```

## Advanced Usage

### Providing additional data to rules

Rules can accept additional data provided at the time of calling `authorize`. A `data` property is provided along with the `user` property to each of your rule functions.

```ts
// rule function
async function isAdminWithNumber({
  user,
  data,
}: {
  user: User;
  data?: number;
}) {
  return user.role === "admin";
}

export let loader: LoaderFunction = async ({ request, params }: LoaderArgs) => {
  let user = await authorizer.authorize(
    { request, params, data: 10 },
    {
      rules: [isAdminWithNumber],
    }
  );
  return json({});
};
```

The type of data is inferred either by the global rules you provide or if none are provided, by the route specific rules applied when calling `authorize`. The type is always unioned with undefined.

Each rule is provided with the same data so the following rule function signatures are incompatible:

```ts
async function isAdminWithNumber({ data }: { data?: number }) {
  return user.role === "admin";
}
async function isAdminWithString({ data }: { data?: string }) {
  return user.role === "admin";
}
```

Instead they would need to take a union of string | number:

```ts
async function isAdmin({ data }: { data?: number | string }) {
  return user.role === "admin";
}
```
