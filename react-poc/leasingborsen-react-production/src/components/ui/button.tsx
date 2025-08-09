import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white shadow-sm hover:bg-accent/90 hover:shadow-md transition-all duration-200 font-semibold",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-2 border-primary bg-white text-primary shadow-sm hover:bg-primary/5 transition-all duration-200 font-semibold",
        secondary:
          "bg-white text-primary border-2 border-primary shadow-sm hover:bg-primary hover:text-white transition-all duration-200 font-semibold",
        ghost:
          "hover:bg-accent/10 hover:text-accent transition-colors duration-200",
        link: "text-accent underline-offset-4 hover:underline hover:text-accent/80",
      },
      size: {
        default: "h-11 px-8 py-2.5 text-sm has-[>svg]:px-6",
        sm: "h-9 rounded-lg gap-1.5 px-5 text-xs has-[>svg]:px-4",
        lg: "h-14 rounded-xl px-10 text-base font-bold has-[>svg]:px-8",
        icon: "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
