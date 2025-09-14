"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/zod-schemas/auth";
import { useResetPassword } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard } from "@/components/common/status-message";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (token) setValue("token", token);
  }, [token, setValue]);

  const onSubmit = (data: ResetPasswordFormData) => resetPassword(data);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary">Reset Password</h1>
          <p className="text-primary-foreground text-sm">Enter a new password for your account.</p>
        </CardHeader>

        <CardContent>
          {error && <ErrorCard error={error} classNames="mb-4" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="token" className="text-sm font-semibold text-primary">
                  Reset Token
                </Label>
                <Input
                  id="token"
                  type="text"
                  {...register("token")}
                  className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
                />
                {errors.token && <p className="text-sm text-red-600">{errors.token.message}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-primary">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-colored-primary colored-button text-white font-medium py-3 disabled:opacity-50"
            >
              {isPending ? "Resetting..." : "Reset password"}
            </Button>
            <div className="text-center pb-2">
              <span className="text-sm text-primary-foreground">
                Already remembered my password?{" "}
              </span>
              <Link href="/login" className="text-sm text-colored-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
