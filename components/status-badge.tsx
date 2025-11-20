import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-xs focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      color: {
        default: "",
        red: "border-red-200 bg-red-100 text-red-900 [&_svg]:stroke-red-900",
        green:
          "border-green-200 bg-green-100 text-green-900 [&_svg]:stroke-green-900",
        teal: "border-teal-200 bg-teal-100 text-teal-900 [&_svg]:stroke-teal-900",
        orange:
          "border-orange-200 bg-orange-100 text-orange-900 [&_svg]:stroke-orange-900",
        cyan: "border-cyan-200 bg-cyan-100 text-cyan-900 [&_svg]:stroke-cyan-900",
        rose: "border-rose-200 bg-rose-100 text-rose-900 [&_svg]:stroke-rose-900",
      },
    },
    defaultVariants: {
      color: "default",
    },
  },
);

export function StatusBadge({
  className,
  color,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="status-badge"
      className={cn(badgeVariants({ color }), className)}
      {...props}
    />
  );
}
