import Image from "next/image";
import React from "react";
import logo from "@/../public/assets/logo.svg";

export const Logo = () => {
  return (
    <div className="flex flex-row justify-start items-center gap-2">
      <Image src={logo} alt="logo small" width={32} height={32} className="w-[32px]" />
      <h1 className="text-primary text-xl font-bold group-data-[collapsible=icon]:hidden">
        FraudList
      </h1>
    </div>
  );
};
