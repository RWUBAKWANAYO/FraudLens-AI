"use client";
import { useEffect } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

export const useRequireAuth = () => {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirectTo = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?redirect=${redirectTo}`);
    }
  }, [user, loading, router, pathname]);

  return { user, loading };
};
