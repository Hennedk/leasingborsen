import React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FormFieldProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onValueChange,
  placeholder = "Select option",
  options,
  disabled = false,
  className = ""
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="block text-sm font-semibold text-primary mb-2">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-11 px-4 py-2 border-2 border-border rounded-lg focus:border-primary transition-colors disabled:opacity-50">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}