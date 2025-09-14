"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/zod-schemas/auth";
import { useRegister } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard, SuccessCard } from "@/components/common/status-message";
import Link from "next/link";

export default function RegisterPage() {
  const { mutate: register, isPending, error, isSuccess } = useRegister();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => register(data);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4 mt-[60px] md:mt-0">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary">Sign up</h1>
          <p className="text-primary-foreground text-sm">Sign up for a new FraudList Account.</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <ErrorCard error={error} classNames="mb-4" />}

            {isSuccess && (
              <SuccessCard res="Your account has been created. Please check your email to verify." />
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold text-primary">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                {...registerField("fullName")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.fullName && <p className="text-sm text-red-600">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-primary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...registerField("email")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-primary">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...registerField("password")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-semibold text-primary">
                Company Name
              </Label>
              <Input
                id="companyName"
                type="text"
                {...registerField("companyName")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.companyName && (
                <p className="text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2 pb-4">
              <Label htmlFor="companySlug" className="text-sm font-semibold text-primary">
                Company Slug
              </Label>
              <Input
                id="companySlug"
                type="text"
                {...registerField("companySlug")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.companySlug && (
                <p className="text-sm text-red-600">{errors.companySlug.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-colored-primary colored-button text-white font-medium py-3 disabled:opacity-50"
            >
              {isPending ? "Creating account..." : "Create account"}
            </Button>
            <div className="text-center py-2">
              <span className="text-sm text-primary-foreground">Already have an account? </span>
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
