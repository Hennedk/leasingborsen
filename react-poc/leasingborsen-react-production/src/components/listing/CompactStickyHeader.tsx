import { ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
        "transition-all duration-200 ease-out"
      )}
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <div className="flex items-center gap-3 px-3 h-14">
        {/* Back button - matches floating button position */}
        <Link to={`/listings?${searchParams.toString()}`}>
          <Button 
            variant="secondary" 
            size="icon"
            className="h-10 w-10 bg-background/90 shadow-sm"
            aria-label="Tilbage til søgeresultater"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        {/* Car title and result count */}
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">
            {title}
            {variant && (
              <span className="text-muted-foreground ml-1 font-normal">
                {variant}
              </span>
            )}
          </h1>
          {resultCount && (
            <p className="text-xs text-muted-foreground">
              {resultCount} søgeresultater
            </p>
          )}
        </div>
      </div>
    </header>
  )
}

export default CompactStickyHeader