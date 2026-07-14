import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    registered?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return <LoginForm registrationPending={params.registered === "1"} />;
}
