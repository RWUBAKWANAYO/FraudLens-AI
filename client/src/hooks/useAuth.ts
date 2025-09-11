import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      password: string;
      companyName: string;
      companySlug: string;
    }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Registration failed");
      return response;
    },
  });
};

export const useVerifyEmail = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/verify-email?token=${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Email verification failed");
      return response;
    },
    onSuccess: () => router.push("/login"),
  });
};

export const useLogin = () => {
  const router = useRouter();
  const redirectPath = useSearchParams().get("redirect") || "/dashboard";

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Login failed");
      return response;
    },
    onSuccess: () => router.replace(redirectPath),
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Password reset request failed");
      return response;
    },
  });
};

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Password reset failed");
      return response;
    },
    onSuccess: () => router.push("/login?reset=true"),
  });
};

export const useAcceptInvite = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/accept-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Invitation acceptance failed");
      return response;
    },
    onSuccess: () => router.push("/login"),
  });
};
