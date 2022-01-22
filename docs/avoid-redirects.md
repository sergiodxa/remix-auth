# Avoid Redirects

When using this package the authentication happens completely server-side, this means that if you are using a redirect-based flow like OAuth2 the user will leave your app in order to complete the authorization flow on the 3rd party provider.

1. User starts login flow
2. Remix Auth redirects the user to the provider
3. User authenticates itself on the provider and authorizes the app
4. Provider redirects the user back to the app
5. Remix Auth completes the authentication and redirects the user to `/`

This is the normal OAuth2 flow most webapps will follow, but Remix let's you do it better since most login flows can use a loader to start the process which means you can render this:

```tsx
<a href="/auth/github">Sign in with GitHub</a>
```

And that will correctly start the authentication flow, another option is to use a form.

```tsx
<form action="/auth/github" method="get">
  <button>Sign in with GitHub</button>
</form>
```

Either a GET or POST, if you used an action, will work. But the main benefit of using a form over a simple link is that you can use the Remix's Form component to improve the UX.

```tsx
<Form action="/auth/github" method="get">
  <button>Sign in with GitHub</button>
</Form>
```

This way Remix will try to use Fetch to do the GET request. If it's the first time the user logins into your app it will be redirected to the provider as usual, otherwise Remix will follow all the redirects client-side so you can render a loading state using the `useTransition` hook and the user will never leave your app.
