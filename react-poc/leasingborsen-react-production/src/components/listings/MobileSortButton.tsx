import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SortOrder, SortOption } from '@/types'

interface MobileSortButtonProps {
  sortOptions: SortOption[]
  sortOrder: SortOrder
  onSortChange: (order: SortOrder) => void
  className?: string
}

const MobileSortButton: React.FC<MobileSortButtonProps> = ({
  sortOptions,
  sortOrder,
  onSortChange,
  className = ""
}) => {
  return (
    <div className={`lg:hidden ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 flex items-center gap-2"
            aria-label="Sortering"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {sortOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={cn(
                "cursor-pointer text-sm",
                sortOrder === option.value && "text-primary font-medium bg-muted"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MobileSortButton