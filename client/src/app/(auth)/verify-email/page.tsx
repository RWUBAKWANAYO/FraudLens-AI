"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useVerifyEmail } from "@/hooks/useAuth";

const VerifyEmail = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: verifyEmail, isPending, error, isSuccess } = useVerifyEmail();

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token, verifyEmail]);

  if (isPending) {
    return <div>Verifying your email...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error.message}
      </div>
    );
  }

  if (isSuccess) {
    return <div>Email verified successfully! Redirecting to login...</div>;
  }

  return <div>No verification token provided</div>;
};

export default VerifyEmail;
