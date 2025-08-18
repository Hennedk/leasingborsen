import React from 'react'
import { Link } from 'react-router-dom'
import Container from '@/components/Container'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-surface-dark text-surface-dark-foreground border-t md:border-t-0 border-border/50 mt-auto">
      <Container className="py-8">
        <div className="text-center space-y-4">
          {/* Logo */}
          <Link to="/" className="inline-block">
            <span className="text-2xl text-primary" style={{ fontFamily: 'Poppins', fontWeight: 800 }}>
              Leasingbuddy
            </span>
          </Link>
          
          {/* Payload - Similar to hero banner */}
          <p className="text-foreground/70 max-w-2xl mx-auto">
            Få overblik over hele markedets privatleasingtilbud, sammenlign priser og vilkår, og vælg den bil, der passer perfekt til dine behov.
          </p>
          
          {/* Copyright */}
          <p className="text-foreground/60 text-sm pt-4">
            © {currentYear} Leasingbuddy. Alle rettigheder forbeholdes.
          </p>
        </div>
      </Container>
    </footer>
  )
}

export default Footer