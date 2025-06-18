import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useReferenceData } from '@/hooks/useReferenceData'
import type { Make } from '@/types'

// Popular makes list (these will be shown first)
const POPULAR_MAKES = ['Volkswagen', 'Skoda', 'Toyota', 'Audi', 'Mercedes-Benz', 'BMW', 'Cupra', 'Hyundai', 'Kia', 'Renault']

// Component props interface
interface CarMakesDropdownProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const CarMakesDropdown: React.FC<CarMakesDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "Vælg mærke",
  disabled = false,
  className
}) => {
  const { data: referenceData } = useReferenceData()

  // Handle value change to convert "all" back to empty string
  const handleValueChange = (newValue: string) => {
    if (newValue === "all") {
      onValueChange("")
    } else {
      onValueChange(newValue)
    }
  }

  // Separate popular and all makes from backend data
  const popularMakes = React.useMemo(() => {
    if (!referenceData?.makes) return []
    return referenceData.makes
      .filter((make: Make) => POPULAR_MAKES.includes(make.name))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [referenceData?.makes])

  const allMakes = React.useMemo(() => {
    if (!referenceData?.makes) return []
    return referenceData.makes
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [referenceData?.makes])

  // Loading state
  if (!referenceData?.makes) {
    return (
      <Select disabled={true}>
        <SelectTrigger className={cn("h-11", className)}>
          <SelectValue placeholder="Indlæser mærker..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value || "all"} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-11", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* All Makes Option */}
        <SelectItem value="all">
          Alle mærker
        </SelectItem>

        {/* Popular Makes Section */}
        {popularMakes.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-2">
              Populære mærker
            </SelectLabel>
            {popularMakes.map((make: Make) => (
              <SelectItem key={`popular-${make.id}`} value={make.name}>
                {make.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Visual Separator */}
        {popularMakes.length > 0 && allMakes.length > 0 && (
          <div className="h-px bg-border mx-2 my-1" />
        )}

        {/* All Makes Section */}
        {allMakes.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-2">
              Alle mærker
            </SelectLabel>
            {allMakes.map((make: Make) => (
              <SelectItem key={make.id} value={make.name}>
                {make.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}

export default CarMakesDropdown