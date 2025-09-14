"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInviteSchema, type AcceptInviteFormData } from "@/lib/zod-schemas/auth";
import { useAcceptInvite } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SwitchThemeButton } from "@/components/common/mode-toggle";
import { Logo } from "@/components/common/logo";
import { ErrorCard } from "@/components/common/status-message";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: acceptInvite, isPending, error } = useAcceptInvite();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  });

  useEffect(() => {
    if (token) setValue("token", token);
  }, [token, setValue]);

  const onSubmit = (data: AcceptInviteFormData) => acceptInvite(data);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <Logo />
        <SwitchThemeButton />
      </div>

      <Card className="w-full max-w-md bg-foreground shadow-lg border-0 p-4">
        <CardHeader className="pb-6">
          <h1 className="text-2xl font-bold text-primary">Accept Invitation</h1>
          <p className="text-primary-foreground text-sm">
            Set a password to join the invited company.
          </p>
        </CardHeader>

        <CardContent>
          {error && <ErrorCard error={error} classNames="mb-4" />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="token" className="text-sm font-semibold text-primary">
                  Invitation Token
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
                Password
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
              {isPending ? "Accepting..." : "Accept invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
