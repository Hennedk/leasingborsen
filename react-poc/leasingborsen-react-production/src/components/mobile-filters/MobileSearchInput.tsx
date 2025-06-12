import React from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface MobileSearchInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Reusable search input component for mobile filter views
 * Provides consistent search experience across make/model selection
 * 
 * Features:
 * - Search icon positioning
 * - Consistent styling with design system
 * - Proper padding for icon
 * - Optimized for mobile touch targets
 */
const MobileSearchInput: React.FC<MobileSearchInputProps> = ({
  placeholder,
  value,
  onChange,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-11"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
    </div>
  )
}

export default MobileSearchInput