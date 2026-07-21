import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    passwordUpdated?: string | string[];
    registered?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <LoginForm
      passwordUpdated={params.passwordUpdated === "1"}
      registrationPending={params.registered === "1"}
    />
  );
}
