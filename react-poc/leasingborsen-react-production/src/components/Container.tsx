import React from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps {
  children: React.ReactNode
  className?: string
  /** Whether to apply horizontal padding (default: true) */
  padding?: boolean
  /** Custom max width override */
  maxWidth?: string
}

const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  padding = true,
  maxWidth = 'max-w-[1440px]'
}) => {
  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidth,
      padding && 'px-4 md:px-12',
      className
    )}>
      {children}
    </div>
  )
}

export default Container