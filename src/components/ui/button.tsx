"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantCls: Record<Variant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-800",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-gray-600 hover:bg-gray-100",
};
const sizeCls: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 rounded",
  md: "text-sm px-3 py-2 rounded-md",
  lg: "text-sm px-4 py-2.5 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variantCls[variant],
        sizeCls[size],
        className
      )}
      {...props}
    />
  );
});
