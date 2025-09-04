import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 !border-border flex w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "h-8 px-2 py-1 text-sm",
        md: "h-10 px-3 py-1 text-sm",
        default: "h-12 px-3 py-1",
        lg: "h-14 px-4 py-2 text-base font-medium",
      },
      background: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      size: "default",
      background: "default",
    },
  }
)

function Input({ 
  className, 
  type, 
  size,
  background,
  ...props 
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, background }), className)}
      {...props}
    />
  )
}

export { Input }
