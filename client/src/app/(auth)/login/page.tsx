"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/zod-schemas/auth";
import { useLogin } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard } from "@/components/common/status-message";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  const { mutate: login, isPending, error } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login({ ...data });
  };

  const testModeLogin = () =>
    login({
      email: process.env.NEXT_PUBLIC_TEST_EMAIL!,
      password: process.env.NEXT_PUBLIC_TEST_PASSWORD!,
    });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4 mt-[60px] md:mt-0">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary">Sign in</h1>
          <p className="text-primary-foreground text-sm">Enter your Proton Account details.</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && <ErrorCard error={error} classNames="mb-4" />}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-primary">
                Email or username
              </Label>
              <Input
                id="email"
                type="text"
                {...register("email")}
                className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary"
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-primary">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="border-primary-foregroundHalf focus:border-colored-primary focus-visible:ring-colored-primary  pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keep-signed-in"
                  checked={keepSignedIn}
                  onCheckedChange={(checked) => setKeepSignedIn(checked as boolean)}
                />
                <Label htmlFor="keep-signed-in" className="text-sm font-medium text-primary">
                  Keep me signed in
                </Label>
              </div>
              <p className="text-xs text-primary-foreground">Recommended on trusted devices.</p>
            </div>
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-colored-primary colored-button text-white font-medium py-3 disabled:opacity-50"
              >
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
              <div className="text-center text-sm font-semibold text-primary">Or</div>
              <Button
                type="button"
                disabled={isPending}
                className="w-full border border-colored-primary bg-colored-shadow shadow-none font-normal colored-button text-colored-primary py-3 disabled:opacity-50 hover:border-transparent"
                onClick={testModeLogin}
              >
                {isPending ? "Signing in..." : "Login in test mode"}
              </Button>
            </div>
            <div className="text-center">
              <span className="text-sm text-primary-foreground">New to FraudLens AI? </span>
              <Link href="/register" className="text-sm text-colored-primary hover:underline">
                Create account
              </Link>
            </div>

            <div className="text-center border-t border-accent-foreground pt-4">
              <Link
                href="/forgot-password"
                className="text-sm text-colored-primary hover:underline"
              >
                Forgot password? Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
