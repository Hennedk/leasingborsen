import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden cursor-default",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground border-border [a&]:hover:bg-surface-alt [a&]:hover:text-foreground",
        // New variants for filter chips
        "filter-selected":
          "bg-surface-brand text-foreground !border-border hover:bg-surface-brand/80 cursor-pointer font-normal",
        "filter-unselected":
          "hover:bg-muted/50 !border-border hover:!border-border cursor-pointer font-normal",
        // Result context badges (subtle, non-intrusive)
        "result-count":
          "px-2.5 py-1 text-xs bg-secondary text-secondary-foreground border-border",
        // For active filter chips in results context  
        "result-filter":
          "px-2.5 py-1.5 text-xs bg-background text-foreground !border-border hover:bg-muted/50 font-normal",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-12 px-4 text-sm",
        lg: "h-14 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
