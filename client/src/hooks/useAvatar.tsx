import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken } from "@/lib/api";
import { useToast } from "./use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { User } from "@/types/user.interface";

interface AvatarResponse {
  message: string;
  user: User;
}

export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateUser } = useAuthContext();

  return useMutation({
    mutationFn: async ({ file }: { userId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(`/users/me/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data as AvatarResponse;
    },
    onSuccess: (data) => {
      updateUser({
        avatarUrl: data.user.avatarUrl,
        avatarPublicId: data.user.avatarPublicId,
      } as User);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast({
        title: "Avatar Updated",
        description: data.message,
        style: {
          background: "var(--foreground)",
          color: "var(--primary-green)",
          border: "1px solid var(--primary-green)",
        },
      });
    },

    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.response?.data?.error || "Failed to upload avatar",
        style: {
          background: "var(--foreground)",
          color: "var(--primary-red)",
          border: "1px solid var(--primary-red)",
        },
      });
    },
  });
};

export const useDeleteAvatar = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateUser } = useAuthContext();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/users/me/avatar`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      });

      return response.data as AvatarResponse;
    },
    onSuccess: (data) => {
      updateUser({
        avatarUrl: undefined,
        avatarPublicId: undefined,
      } as User);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });

      toast({
        title: "Avatar Removed",
        description: data.message,
        style: {
          background: "var(--foreground)",
          color: "var(--primary-green)",
          border: "1px solid var(--primary-green)",
        },
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.response?.data?.error || "Failed to delete avatar",
        style: {
          background: "var(--foreground)",
          color: "var(--primary-red)",
          border: "1px solid var(--primary-red)",
        },
      });
    },
  });
};
