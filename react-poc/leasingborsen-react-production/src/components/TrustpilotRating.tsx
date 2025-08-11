import React from 'react'

interface TrustpilotRatingProps {
  className?: string
  stars?: number
  totalStars?: number
}

const TrustpilotRating: React.FC<TrustpilotRatingProps> = ({ 
  className = '',
  stars = 4.5,
  totalStars = 5
}) => {
  const fullStars = Math.floor(stars)
  const hasHalfStar = stars % 1 !== 0
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[...Array(totalStars)].map((_, index) => {
          const isFull = index < fullStars
          const isHalf = index === fullStars && hasHalfStar
          
          return (
            <div key={index} className="relative">
              {/* Background star (empty) */}
              <svg 
                className="w-6 h-6 text-gray-300" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              
              {/* Filled star (green) */}
              {(isFull || isHalf) && (
                <svg 
                  className="w-6 h-6 text-[#00b67a] absolute top-0 left-0" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  style={{
                    clipPath: isHalf ? 'inset(0 50% 0 0)' : 'none'
                  }}
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Trustpilot text */}
      <div className="flex items-center gap-1">
        <svg className="w-5 h-5 text-[#00b67a]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-gray-700 font-medium">Trustpilot</span>
      </div>
    </div>
  )
}

export default TrustpilotRating