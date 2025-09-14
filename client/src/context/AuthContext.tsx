"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@/types/user.interface";
import { publicRoutes } from "@/config/app-routes";
import { AuthContextType } from "./types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshAccessToken = async () => {
    try {
      setLoading(true);
      const resp = await api.post("/auth/refresh-token", {}, { withCredentials: true });
      const accessToken = resp.data?.accessToken;
      const user = resp.data?.user;

      if (!accessToken || !user) {
        setAccessToken(null);
        setUser(null);
        return;
      }
      setAccessToken(accessToken);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!publicRoutes.includes(pathname)) {
      refreshAccessToken();
    } else {
      setLoading(false);
    }
  }, [pathname]);

  const login = async (email: string, password: string) => {
    const resp = await api.post("/auth/login", { email, password }, { withCredentials: true });

    const accessToken = resp.data?.accessToken;
    const user = resp.data?.user;

    if (!accessToken) throw new Error("Login did not return access token");

    setAccessToken(accessToken);
    setUser(user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {}, { withCredentials: true });
    } catch {
    } finally {
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
    }
  };

  const updateUser = (user: User) => {
    setUser((prev) => (prev ? { ...prev, ...user } : user));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAccessToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
