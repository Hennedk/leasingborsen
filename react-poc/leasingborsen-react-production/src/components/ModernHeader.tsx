import React from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Container from '@/components/Container'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const ModernHeader: React.FC = () => {

  return (
    <header className="lg:sticky top-0 z-50 w-full border-b border-border/50 bg-card">
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

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Link to="/" className="flex items-center">
                    <span className="text-lg text-primary" style={{ fontFamily: 'Poppins', fontWeight: 800 }}>
                      Leasingbuddy
                    </span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 py-6">
                {/* Mobile Admin Link */}
                <div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/admin">Admin</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}

export default ModernHeader