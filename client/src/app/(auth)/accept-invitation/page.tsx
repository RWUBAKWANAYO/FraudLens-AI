"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInviteSchema, type AcceptInviteFormData } from "@/lib/zod-schemas/auth";
import { useAcceptInvite } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";

const AcceptInvite = () => {
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
    if (token) {
      setValue("token", token);
    }
  }, [token, setValue]);

  const onSubmit = (data: AcceptInviteFormData) => {
    acceptInvite(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error.message}
        </div>
      )}

      {!token && (
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700">
            Invitation Token
          </label>
          <input
            {...register("token")}
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.token && <p className="mt-1 text-sm text-red-600">{errors.token.message}</p>}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          {...register("password")}
          type="password"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isPending ? "Accepting..." : "Accept invitation"}
      </button>
    </form>
  );
};

export default AcceptInvite;
