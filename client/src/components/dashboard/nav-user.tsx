"use client";

import { ChevronsUpDown, LogOut, PenLine, Loader2, Trash } from "lucide-react";
import { useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/useAvatar";
import { useToast } from "@/hooks/use-toast";
import { User } from "@/types/user.interface";

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar();
  const { logout, user: currentUser } = useAuthContext();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Upload failed",
          description: "File size must be less than 2MB",
          style: {
            background: "var(--foreground)",
            color: "var(--primary-green)",
            border: "1px solid var(--primary-green)",
          },
        });
        return;
      }

      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Upload failed",
          description: "Invalid file type. Only JPEG, PNG, GIF, and WebP files are allowed.",
          style: {
            background: "var(--foreground)",
            color: "var(--primary-green)",
            border: "1px solid var(--primary-green)",
          },
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarEdit = () => {
    fileInputRef.current?.click();
  };

  const handleSave = () => {
    if (selectedFile && currentUser) {
      uploadAvatar.mutate(
        {
          userId: currentUser.id,
          file: selectedFile,
        },
        {
          onSuccess: () => {
            setPreview(null);
            setSelectedFile(null);
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    if (currentUser && user.avatarUrl) {
      deleteAvatar.mutate();
    }
  };

  const isLoading = uploadAvatar.isPending || deleteAvatar.isPending;

  return (
    <SidebarMenu className="w-fit">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isLoading}>
            <SidebarMenuButton size="lg" className="border-0 outline-none">
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={user.avatarUrl} alt={user.fullName} className="object-cover" />
                <AvatarFallback className="rounded-lg bg-accent border border-accent-foreground font-bold text-primary">
                  {user.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isMobile && (
                <div className="flex flex-col text-left text-sm leading-tight w-fit">
                  <span className="truncate font-bold text-base">{user.fullName}</span>
                  <span className="truncate text-xs font-medium text-primary-foreground">
                    {user.email}
                  </span>
                </div>
              )}
              <ChevronsUpDown className="ml-4 size-6" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg border border-accent-foreground bg-foreground p-4"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <div className="relative flex flex-col items-center gap-3">
              <div className="relative h-20 w-20">
                <Avatar className="h-20 w-20 rounded-full border border-accent-foreground bg-accent">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full w-full">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <AvatarImage
                        src={preview || user.avatarUrl}
                        alt={user.fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-full text-lg">
                        {user.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>

                {!isLoading && (
                  <button
                    type="button"
                    onClick={handleAvatarEdit}
                    className="absolute bottom-[5px] right-[-10px] rounded-full bg-colored-primary flex items-center justify-center w-7 h-7 text-white shadow border border-accent-foreground"
                    disabled={isLoading}
                  >
                    <PenLine className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              <div className="text-center">
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-xs text-primary-foreground">{user.email}</p>
              </div>
            </div>

            {preview && !isLoading && (
              <div className="mt-3 flex gap-2">
                <Button
                  size={"sm"}
                  onClick={handleCancel}
                  className="flex-1 text-primary bg-transparent border border-accent-foreground colored-button shadow-sm"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size={"sm"}
                  onClick={handleSave}
                  className="flex-1 bg-colored-primary text-white colored-button shadow-none"
                  disabled={isLoading}
                >
                  Save
                </Button>
              </div>
            )}

            {user.avatarUrl && !preview && !isLoading && (
              <div className="mt-3">
                <Button
                  onClick={handleRemoveAvatar}
                  className="w-full cursor-pointer text-primary shadow-sm border border-accent-foreground flex justify-center bg-transparent hover:bg-shadow-red hover:text-primary-red hover:border-primary-red"
                  disabled={isLoading}
                  variant="outline"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Remove Avatar
                </Button>
              </div>
            )}

            <DropdownMenuLabel className="p-0 my-4 font-normal">
              <Button
                onClick={() => logout()}
                className="w-full cursor-pointer text-primary shadow-sm border border-accent-foreground flex justify-center bg-transparent hover:bg-shadow-red hover:text-primary-red hover:border-primary-red"
                disabled={isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

