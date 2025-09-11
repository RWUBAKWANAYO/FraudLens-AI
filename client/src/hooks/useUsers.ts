import { User } from "@/types/user.interface";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";

// GET ALL USERS
export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () =>
      api
        .get("/users", {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
  });
};

// EDIT USER ROLE
export const useEditUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api
        .patch(
          `/users/${userId}/role`,
          { role },
          { headers: { Authorization: `Bearer ${getAccessToken()}` } }
        )
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

// REMOVE USER
export const useRemoveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      api
        .delete(`/users/${userId}`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};

// INVITE USER
export const useInviteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api
        .post("/auth/invite", data, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
};
