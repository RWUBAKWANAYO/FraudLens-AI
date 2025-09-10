below is how I'm using @tanstack/react-query to fetch api data. use react-hook-form, zod to create me login, register, verify-email, forgot-password, reset-password, accept-invite based on below post api requests:

//=========================================================
// References of how hooks to call api built
//=========================================================

"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

export const useLogin = () => {
  const router = useRouter();
  const redirectPath = useSearchParams().get("redirect") || "/employees";
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

//=========================================================
// postman - register({{BASE_URL}}/auth/register)
//=========================================================
1. body:
{
  "fullName": "Humble Nayo",
  "email": "humblenayo@gmail.com",
  "password": "securepassword123",
  "companyName": "Nayo Group",
  "companySlug": "nayo-inc"
}

//=========================================================
// postman - verify-email({{BASE_URL}}/auth/verify-email?token=8ab2113048e63478ef28e6196e5160d952e1ff985dcd676167193f7ca193cf1d)
//=========================================================
1. params:
token = {{EmailToken}}

//=========================================================
// postman - reset-password({{BASE_URL}}/auth/reset-password)
//=========================================================
1. body:
{
    "token": "72fa11eea20317053f7af8ad692c983d5aaf8590ac8ab9bfaf396f6efba20f98dg",
    "password": "humblenayo@gmail.com"
}

//=========================================================
// postman - current-user for verify if user still authenticated({{BASE_URL}}/auth/me)
//=========================================================
1. Authorization:
Authorization: `Bearer ${token}`

//=========================================================
// postman - accept-invite({{BASE_URL}}/auth/accept-invitation)
//=========================================================
1. body:
{
    "token":"955a1fb22b80fde4fc66565822807b8d403c39a63e52a1a551a76fec5bac8371",
    "password":"rubymutsinziruby@gmail.com"
}
