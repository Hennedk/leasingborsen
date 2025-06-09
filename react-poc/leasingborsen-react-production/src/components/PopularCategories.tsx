import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Zap, DollarSign, Users, Building, Settings } from 'lucide-react'

// More specific TypeScript types
interface CategoryFilters {
  fuel_type?: 'Electric' | 'Petrol' | 'Diesel' | 'Hybrid'
  price_max?: number
  body_type?: 'SUV' | 'Microcar' | 'Sedan' | 'Hatchback' | 'Stationcar'
  transmission?: 'Automatic' | 'Manual'
}

interface CategoryItem {
  id: string
  label: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  filters: CategoryFilters
}

interface PopularCategoriesProps {
  title?: string
  categories?: CategoryItem[]
  className?: string
  onNavigationError?: (error: Error) => void
}

// Separate CategoryCard component for better composition
interface CategoryCardProps {
  category: CategoryItem
  onClick: (filters: CategoryFilters) => void
  isLoading?: boolean
}

const CategoryCard: React.FC<CategoryCardProps> = ({ 
  category, 
  onClick, 
  isLoading = false 
}) => {
  const IconComponent = category.icon

  const handleClick = () => {
    if (!isLoading) {
      onClick(category.filters)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
      e.preventDefault()
      onClick(category.filters)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Filter by ${category.label}: ${category.subtitle}`}
      className={`
        group cursor-pointer transition-all duration-300 
        hover:shadow-xl hover:-translate-y-1 
        border border-border/50 hover:border-primary/20 hover:bg-card/50
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="space-y-3 text-center">
          {/* Icon with primary color and hover animation */}
          <div className="flex justify-center">
            <div className="text-primary group-hover:text-primary group-hover:scale-110 transition-all duration-300">
              <IconComponent className="w-8 h-8 lg:w-10 lg:h-10" />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
            {category.label}
          </h3>
          
          {/* Subtitle */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            {category.subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

const defaultCategories: CategoryItem[] = [
  {
    id: 'electric',
    label: 'Elbiler',
    subtitle: 'Miljøvenlige valg',
    icon: Zap,
    filters: {
      fuel_type: 'Electric'
    }
  },
  {
    id: 'cheap',
    label: 'Billige biler',
    subtitle: 'Under 2.000 kr./md',
    icon: DollarSign,
    filters: {
      price_max: 2000
    }
  },
  {
    id: 'family',
    label: 'Familiebiler',
    subtitle: 'SUV & Stationcars',
    icon: Users,
    filters: {
      body_type: 'SUV'
    }
  },
  {
    id: 'city',
    label: 'Bybiler',
    subtitle: 'Kompakte & smarte',
    icon: Building,
    filters: {
      body_type: 'Microcar'
    }
  },
  {
    id: 'automatic',
    label: 'Automatgear',
    subtitle: 'Nem kørsel',
    icon: Settings,
    filters: {
      transmission: 'Automatic'
    }
  }
]

const PopularCategories: React.FC<PopularCategoriesProps> = ({
  title = "Populære kategorier",
  categories = defaultCategories,
  className = "",
  onNavigationError
}) => {
  const navigate = useNavigate()
  const [isNavigating, setIsNavigating] = useState(false)
  
  // Limit categories to 4 on mobile to avoid third row (2x2 grid)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const displayCategories = isMobile ? categories.slice(0, 4) : categories

  // Enhanced navigation function with error handling
  const navigateToCategory = async (filters: CategoryFilters) => {
    try {
      setIsNavigating(true)
      
      // Handle special case for family cars (multiple body types)
      if (filters.body_type === 'SUV') {
        navigate('/listings?body_type=SUV')
        return
      }
      
      // Convert filters to query parameters with proper validation
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.set(key, value.toString())
        }
      })
      
      const queryString = queryParams.toString()
      const targetUrl = queryString ? `/listings?${queryString}` : '/listings'
      
      navigate(targetUrl)
      
    } catch (error) {
      console.error('Navigation error:', error)
      const navigationError = error instanceof Error 
        ? error 
        : new Error('Unknown navigation error')
      
      onNavigationError?.(navigationError)
    } finally {
      setIsNavigating(false)
    }
  }

  return (
    <section 
      className={`bg-background ${className}`}
      aria-labelledby="popular-categories-heading"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12">
        {/* Left-aligned header with proper accessibility */}
        <div className="mb-4 lg:mb-4">
          <h2 
            id="popular-categories-heading"
            className="text-3xl font-bold text-foreground"
          >
            {title}
          </h2>
        </div>

        {/* Responsive grid with proper ARIA labels */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6"
          role="group"
          aria-labelledby="popular-categories-heading"
        >
          {displayCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={navigateToCategory}
              isLoading={isNavigating}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default PopularCategories