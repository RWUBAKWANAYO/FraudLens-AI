"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useVerifyEmail } from "@/hooks/useAuth";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard, StatusMessage, SuccessCard } from "@/components/common/status-message";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: verifyEmail, isPending, error, isSuccess } = useVerifyEmail();

  useEffect(() => {
    if (token) verifyEmail(token);
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary text-center">Verify Email</h1>
          <p className="text-primary-foreground text-sm text-center">
            Let us verify your email address to activate your account.
          </p>
        </CardHeader>

        <CardContent>
          {isPending && <StatusMessage isLoading={isPending} height="50px" />}
          {error && <ErrorCard error={error} classNames="mb-4 text-center" />}
          {isSuccess && (
            <>
              <SuccessCard
                res="Email verified successfully! Redirecting to login..."
                classNames="mb-4 text-center"
              />
              <div className="text-center">
                <span className="text-sm text-primary-foreground"> Fail to redirect? </span>
                <Link href="/login" className="text-sm text-colored-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
          {!token && (
            <ErrorCard error={"No verification token provided."} classNames="mb-4 text-center" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
