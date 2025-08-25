import React, { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useFilterStore } from '@/stores/consolidatedFilterStore'
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
        cursor-pointer 
        border border-border/50
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="space-y-3 text-center">
          {/* Icon with primary color */}
          <div className="flex justify-center">
            <div className="text-primary">
              <IconComponent className="w-8 h-8 lg:w-10 lg:h-10" />
            </div>
          </div>
          
          {/* Title */}
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
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
  const { resetFilters, setFilter } = useFilterStore()
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

  // Enhanced navigation function with clear-then-apply logic
  const navigateToCategory = async (filters: CategoryFilters) => {
    try {
      setIsNavigating(true)
      
      // Step 1: Clear all existing filters first
      resetFilters()
      
      // Step 2: Apply only the category filters to global state
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'fuel_type') {
            setFilter('fuel_type', [value as string])
          } else if (key === 'price_max') {
            setFilter('price_max', value as number)
          } else if (key === 'body_type') {
            setFilter('body_type', [value as string])
          } else if (key === 'transmission') {
            setFilter('transmission', [value as string])
          }
        }
      })
      
      // Step 3: Navigate to listings page (filters are now in global state)
      navigate({ to: '/listings' })
      
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
            className="text-2xl font-semibold text-foreground"
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