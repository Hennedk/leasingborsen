import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface CompactStickyHeaderProps {
  title: string
  variant?: string
  resultCount?: number
}

const CompactStickyHeader: React.FC<CompactStickyHeaderProps> = ({ 
  title,
  variant,
  resultCount 
}) => {
  const [searchParams] = useSearchParams()
  
  return (
    <header 
      className={cn(
        "fixed top-0 inset-x-0 z-40 lg:hidden mobile-sticky-header",
        "bg-background/95 backdrop-blur-md border-b",
        "transform -translate-y-full opacity-0",
        "transition-all duration-150 ease-out"
      )}
      style={{ 
        paddingTop: 'max(0px, env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="flex items-center gap-2 px-3 h-12">
        {/* Back to results chip */}
        <Link 
          to={`/listings?${searchParams.toString()}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2 -mx-2 rounded-md"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden xs:inline">Tilbage til</span>
          <span>resultater</span>
          {resultCount && (
            <span className="text-primary font-medium">({resultCount})</span>
          )}
        </Link>
        
        {/* Separator */}
        <div className="w-px h-4 bg-border" />
        
        {/* Car title */}
        <h1 className="text-sm font-medium flex-1 min-w-0">
          <span className="truncate block">
            {title}
            {variant && (
              <span className="text-muted-foreground ml-1 font-normal">
                {variant}
              </span>
            )}
          </span>
        </h1>
      </div>
    </header>
  )
}

export default CompactStickyHeader