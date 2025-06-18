import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const selectTriggerVariants = cva(
  "",
  {
    variants: {
      size: {
        sm: "h-9",
        default: "h-10", 
        lg: "h-11"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const labelVariants = cva(
  "block font-semibold text-foreground text-left",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm", 
        lg: "text-sm"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

interface FormFieldProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  className?: string
  size?: "sm" | "default" | "lg"
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onValueChange,
  placeholder = "Select option",
  options,
  disabled = false,
  className = "",
  size = "default"
}) => {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className={labelVariants({ size })}>
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={selectTriggerVariants({ size })}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg">
          {options.map((option, index) => (
            <SelectItem key={`form-option-${index}-${option.value}`} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}