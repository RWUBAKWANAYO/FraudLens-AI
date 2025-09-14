"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/zod-schemas/auth";
import { useForgotPassword } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard, SuccessCard } from "@/components/common/status-message";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { mutate: forgotPassword, isPending, error, isSuccess } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => forgotPassword(data.email);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
          <p className="text-primary-foreground text-sm">
            Enter your email to reset your password.
          </p>
        </CardHeader>

        <CardContent>
          {error && <ErrorCard error={error} classNames="mb-4" />}
          {isSuccess && (
            <SuccessCard
              res="If your email is in our system, you will receive an email with instructions about how to reset your password."
              classNames="mb-4"
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-primary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-colored-primary colored-button text-white font-medium py-3 disabled:opacity-50"
            >
              {isPending ? "Sending..." : "Send reset instructions"}
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
