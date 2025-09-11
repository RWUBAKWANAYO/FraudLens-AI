import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthContext } from "@/context/AuthContext";

// REGISTER
export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      password: string;
      companyName: string;
      companySlug: string;
    }) => {
      const res = await api.post("/auth/register", data);
      return res.data;
    },
  });
};

// VERIFY EMAIL
export const useVerifyEmail = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post(`/auth/verify-email?token=${token}`);
      return res.data;
    },
    onSuccess: () => router.push("/login"),
  });
};

// LOGIN
export const useLogin = () => {
  const router = useRouter();
  const redirect = useSearchParams().get("redirect") || "/dashboard";
  const { login } = useAuthContext();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) => login(data.email, data.password),
    onSuccess: () => router.replace(redirect),
    retry: false,
  });
};

// LOGOUT
export const useLogout = () => {
  const { logout } = useAuthContext();
  return useMutation({
    mutationFn: logout,
  });
};

// FORGOT PASSWORD
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post("/auth/forgot-password", { email });
      return res.data;
    },
  });
};

// RESET PASSWORD
export const useResetPassword = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await api.post("/auth/reset-password", data);
      return res.data;
    },
    onSuccess: () => router.push("/login?reset=true"),
  });
};

// ACCEPT INVITE
export const useAcceptInvite = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await api.post("/auth/accept-invitation", data);
      return res.data;
    },
    onSuccess: () => router.push("/login"),
  });
};
