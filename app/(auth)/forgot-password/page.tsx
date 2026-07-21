import { ForgotPasswordForm } from "./forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;

  return <ForgotPasswordForm recoveryLinkInvalid={params.error === "invalid"} />;
}
