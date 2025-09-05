"use client";
import React from "react";

import { TriangleAlert } from "lucide-react";

export interface IMessageCard {
  cancelButtonHandler?: () => void;
  actionButtonHandler?: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  cancelButtonName?: string;
  actionButtonName?: string;
  cancelButtonStyle?: string;
  actionButtonStyle?: string;
}

export const ModalMessageCard: React.FC<IMessageCard> = ({
  cancelButtonHandler = () => {},
  actionButtonHandler = () => {},
  title,
  message,
  icon = <TriangleAlert className="w-6 h-6" />,
  iconColor,
  iconBg,
  cancelButtonStyle,
  actionButtonStyle,
  cancelButtonName,
  actionButtonName,
}) => {
  return (
    <div
      className={`w-[90vw] sm:w-[400px] relative  rounded-md overflow-hidden bg-foreground" shadow`}
    >
      <div className="bg-foreground px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div
            className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full  sm:mx-0 sm:h-10 sm:w-10 ${
              iconBg ? iconBg : "bg-badge-redBg"
            }`}
          >
            <div className={`${iconColor ? iconColor : "text-red-600"}`}>{icon}</div>
          </div>
          <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
            <h3 className={`text-lg font-semibold leading-6 text-primary`}>{title}</h3>
            <div className="mt-2">
              <p className={`text-sm font-medium leading-5 text-primary-foreground`}>{message}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={`px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 bg-modalFooter`}>
        <button
          type="button"
          className={`inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold shadow-sm sm:ml-3 sm:w-auto ${
            actionButtonStyle ? actionButtonStyle : "bg-red-500 text-white"
          }`}
          onClick={() => actionButtonHandler()}
        >
          {actionButtonName ? actionButtonName : "Delete"}
        </button>
        <button
          type="button"
          className={`mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm border font-semibold shadow-sm sm:mt-0 sm:w-auto ${
            cancelButtonStyle ? cancelButtonStyle : "border-accent-foreground text-primary"
          }`}
          onClick={() => cancelButtonHandler()}
          data-autofocus
        >
          {cancelButtonName ? cancelButtonName : "Cancel"}
        </button>
      </div>
    </div>
  );
};
