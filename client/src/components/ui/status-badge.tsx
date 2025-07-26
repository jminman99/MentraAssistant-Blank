
import { Badge } from "@/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        confirmed: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900 dark:text-green-200",
        cancelled: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900 dark:text-red-200",
        completed: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-200",
        default: "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
      }
    },
    defaultVariants: {
      status: "default",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ children, status, className, ...props }: StatusBadgeProps) {
  return (
    <Badge className={statusBadgeVariants({ status, className })} {...props}>
      {children}
    </Badge>
  );
}
