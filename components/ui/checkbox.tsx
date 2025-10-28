"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
};

export function Checkbox({ id, checked, onCheckedChange, className, disabled, label }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn("inline-flex items-center gap-2 select-none cursor-pointer", disabled && "opacity-60 cursor-not-allowed")}> 
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          "h-5 w-5 rounded-md border border-zinc-700 bg-black text-white flex items-center justify-center",
          checked && "bg-zinc-800 border-zinc-600",
          "focus:outline-none focus:ring-2 focus:ring-zinc-500",
          className
        )}
      >
        {checked ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : null}
      </button>
      {label ? <span className="text-zinc-300">{label}</span> : null}
    </label>
  );
}


