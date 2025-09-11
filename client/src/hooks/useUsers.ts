import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
  status: "active" | "inactive" | "suspended";
}

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4MGM1NTEwMy1iYjZhLTRmY2EtYmNkNy02ODcyODY3OWVjY2YiLCJlbWFpbCI6Imh1bWJsZW5heW9AZ21haWwuY29tIiwiY29tcGFueUlkIjoiZjE2MzIyNjAtM2VkMS00MDIxLTgxYzUtZWZlNmQ1MGRlMmYzIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzU3NTE3NzU1LCJleHAiOjE3NTgxMjI1NTV9.ksPRHLVgQr8nX-oXhmR-aFJw99ruUqvx6zLeff6fKa0";
const user = {
  id: "80c55103-bb6a-4fca-bcd7-68728679eccf",
  email: "humblenayo@gmail.com",
  fullName: "Humble Nayo",
  role: "ADMIN",
  company: {
    id: "f1632260-3ed1-4021-81c5-efe6d50de2f3",
    name: "Nayo Group",
    slug: "nayo-group",
  },
};

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Failed to fetch users");
      return response;
    },
  });
};

export const useEditUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Failed to update user role");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useRemoveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Failed to remove user");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const response = await res.json();
      if (!res.ok) throw new Error(response.error || "Failed to invite user");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
