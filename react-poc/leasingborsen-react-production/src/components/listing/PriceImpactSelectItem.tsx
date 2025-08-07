import { forwardRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PriceImpactData } from '@/types/priceImpact'

interface PriceImpactSelectItemProps {
  value: string
  label: string
  impact?: PriceImpactData
  isSelected?: boolean
  disabled?: boolean
  onHover?: () => void
  onHoverEnd?: () => void
}

const PriceImpactSelectItem = forwardRef<
  HTMLDivElement,
  PriceImpactSelectItemProps
>(({
  value,
  label,
  impact,
  isSelected = false,
  disabled = false,
  onHover,
  onHoverEnd
}, ref) => {
  // Handle disabled state
  if (disabled) {
    return (
      <SelectPrimitive.Item
        ref={ref}
        value={value}
        disabled={true}
        className={cn(
          "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
          "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="absolute right-2 flex size-3.5 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-4" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
      </SelectPrimitive.Item>
    )
  }
  
  // If no impact data or not available, show regular item without price impact
  if (!impact || !impact.available) {
    return (
      <SelectPrimitive.Item
        ref={ref}
        value={value}
        disabled={false}
        className={cn(
          "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
          "focus:bg-accent focus:text-accent-foreground",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          isSelected && "bg-accent"
        )}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
      >
        <span className="absolute right-2 flex size-3.5 items-center justify-center">
          <SelectPrimitive.ItemIndicator>
            <CheckIcon className="size-4" />
          </SelectPrimitive.ItemIndicator>
        </span>
        <div className="flex items-center gap-2 w-full pr-6">
          <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
          {isSelected && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              Nuværende
            </span>
          )}
        </div>
      </SelectPrimitive.Item>
    )
  }
  
  const formatPriceDifference = (diff: number): string => {
    const absValue = Math.abs(diff)
    if (diff > 0) return `+${absValue.toLocaleString('da-DK')} kr/md`
    if (diff < 0) return `-${absValue.toLocaleString('da-DK')} kr/md`
    return 'Samme pris'
  }
  
  const getImpactColor = (): string => {
    if (impact.isDecrease) return 'text-green-600 dark:text-green-400'
    if (impact.isIncrease) return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }
  
  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
        "focus:bg-accent focus:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isSelected && "bg-accent",
        impact.isCheapest && "ring-1 ring-yellow-500/20"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      
      <div className="flex items-center justify-between w-full pr-6">
        <div className="flex items-center gap-2 flex-1">
          <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
          {isSelected && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              Nuværende
            </span>
          )}
          {impact.isCheapest && !isSelected && (
            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
              Billigst
            </span>
          )}
        </div>
        
        <div className={cn("flex items-center", getImpactColor())}>
          <span className="text-sm font-medium tabular-nums">
            {formatPriceDifference(impact.difference || 0)}
          </span>
        </div>
      </div>
    </SelectPrimitive.Item>
  )
})

PriceImpactSelectItem.displayName = 'PriceImpactSelectItem'

export default PriceImpactSelectItem