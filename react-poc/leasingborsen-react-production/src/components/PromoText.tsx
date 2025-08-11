import React from 'react'

interface PromoTextProps {
  className?: string
  size?: 'default' | 'compact'
}

const PromoText: React.FC<PromoTextProps> = ({ 
  className = '',
  size = 'default' 
}) => {
  const headlineSize = size === 'compact' 
    ? 'clamp(1.5rem, 5vw, 2.5rem)' 
    : 'clamp(2rem, 6vw, 3.5rem)'
  
  const subtitleSize = size === 'compact' 
    ? 'clamp(1rem, 2.5vw, 1.25rem)' 
    : 'clamp(1.125rem, 3vw, 1.5rem)'

  return (
    <div className={`w-full space-y-4 md:space-y-6 ${className}`}>
      <div className="space-y-4">
        {/* Primary Headline */}
        <h1 
          className="font-bold text-white leading-tight tracking-tight" 
          style={{ fontSize: headlineSize }}
        >
          Find de bedste leasingtilbud
        </h1>
        
        {/* Descriptive Subtitle */}
        <p 
          className="text-white/85 leading-relaxed tracking-wide" 
          style={{ fontSize: subtitleSize }}
        >
          Sammenlign leasingaftaler fra forhandlere over hele Danmark – hurtigt og nemt.
        </p>
      </div>
    </div>
  )
}

export default PromoText