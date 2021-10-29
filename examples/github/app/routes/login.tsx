export default function Login() {
  return (
    <form action="/auth/github" method="post">
      <button>Login with GitHub</button>
    </form>
  );
}
