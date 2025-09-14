"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check } from "lucide-react";

type CopyableCellProps = {
  value: string;
  maskable?: boolean;
  defaultVisible?: boolean;
};

export function CopyableCell({
  value,
  maskable = false,
  defaultVisible = false,
}: CopyableCellProps) {
  const [visible, setVisible] = React.useState(defaultVisible);
  const [copied, setCopied] = React.useState(false);

  const toggleSecretVisibility = () => {
    setVisible((prev) => !prev);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop or toast error if you have a toaster
    }
  };

  return (
    <div className="group flex items-center gap-2 max-w-[320px]">
      <span className="font-normal text-sm truncate select-none">
        {maskable && !visible ? "•".repeat(14) : value}
      </span>

      <div className="ml-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {maskable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSecretVisibility}
            className="h-7 w-7 p-0 bg-transparent text-primary hover:bg-colored-primary hover:text-white"
            aria-label={visible ? "Hide value" : "Show value"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-7 w-7 p-0 bg-transparent text-primary hover:bg-colored-primary hover:text-white"
          aria-label="Copy value"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
