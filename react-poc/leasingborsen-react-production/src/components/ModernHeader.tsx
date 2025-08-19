import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Container from '@/components/Container'
import { Button } from '@/components/ui/button'
import { borderVariants } from '@/lib/borderStyles'

const ModernHeader: React.FC = () => {
  const location = useLocation()
  const isHomepage = location.pathname === '/'

  return (
    <header className={`lg:sticky lg:top-0 static z-50 w-full ${borderVariants.header.standard} ${isHomepage ? 'md:border-b-0' : ''} bg-card`}>
      <Container className="flex h-16 items-center justify-between">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 flex-1">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl text-primary" style={{ fontFamily: 'Poppins', fontWeight: 800 }}>
              Leasingbuddy
            </span>
          </Link>
        </div>

        {/* Admin Link */}
        <div className="hidden md:flex">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
        </div>


        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center justify-between w-full">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-lg text-primary" style={{ fontFamily: 'Poppins', fontWeight: 800 }}>
              Leasingbuddy
            </span>
          </Link>
        </div>
      </Container>
    </header>
  )
}

export default ModernHeader