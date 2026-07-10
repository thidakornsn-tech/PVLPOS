import { cn } from "@/lib/utils";

type Tone = "gray" | "green" | "red" | "amber" | "blue";
const toneCls: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
};

export function Badge({ tone = "gray", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", toneCls[tone], className)}>
      {children}
    </span>
  );
}
