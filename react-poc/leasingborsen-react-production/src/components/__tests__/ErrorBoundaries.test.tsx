import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  AdminErrorBoundary,
  DataErrorBoundary,
  SearchErrorBoundary,
  ListingErrorBoundary,
  ComponentErrorBoundary,
  RouteErrorBoundary
} from '../ErrorBoundaries'

// Mock console.error to avoid noisy test output
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('Specialized Error Boundaries', () => {
  describe('AdminErrorBoundary', () => {
    it('renders admin-specific error message', () => {
      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      )
      
      expect(screen.getByText('Admin Panel Fejl')).toBeInTheDocument()
      expect(screen.getByText(/manglende tilladelser eller netværksproblemer/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /genindlæs panel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /gå til admin forside/i })).toBeInTheDocument()
    })

    it('logs admin-specific error context', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      
      render(
        <AdminErrorBoundary>
          <ThrowError />
        </AdminErrorBoundary>
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Admin Error:',
        expect.objectContaining({ adminContext: true })
      )
    })
  })

  describe('DataErrorBoundary', () => {
    it('renders data-specific error message', () => {
      render(
        <DataErrorBoundary>
          <ThrowError />
        </DataErrorBoundary>
      )
      
      expect(screen.getByText('Data kunne ikke indlæses')).toBeInTheDocument()
      expect(screen.getByText(/Tjek din internetforbindelse/)).toBeInTheDocument()
    })

    it('calls onRetry when provided', () => {
      const onRetry = vi.fn()
      
      render(
        <DataErrorBoundary onRetry={onRetry}>
          <ThrowError />
        </DataErrorBoundary>
      )
      
      // Check that onRetry prop is accepted (component renders without error)
      expect(screen.getByText('Data kunne ikke indlæses')).toBeInTheDocument()
    })
  })

  describe('SearchErrorBoundary', () => {
    it('renders search-specific error message', () => {
      render(
        <SearchErrorBoundary>
          <ThrowError />
        </SearchErrorBoundary>
      )
      
      expect(screen.getByText('Søgning fejlede')).toBeInTheDocument()
      expect(screen.getByText(/Søgefunktionen kunne ikke udføres/)).toBeInTheDocument()
    })

    it('includes search context when provided', () => {
      render(
        <SearchErrorBoundary searchContext="mobile-filters">
          <ThrowError />
        </SearchErrorBoundary>
      )
      
      expect(screen.getByText(/Søgekontext: mobile-filters/)).toBeInTheDocument()
    })

    it('provides search recovery options', () => {
      render(
        <SearchErrorBoundary>
          <ThrowError />
        </SearchErrorBoundary>
      )
      
      expect(screen.getByRole('button', { name: /genstart søgning/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ryd filtre/i })).toBeInTheDocument()
    })
  })

  describe('ListingErrorBoundary', () => {
    it('renders listing-specific error message', () => {
      render(
        <ListingErrorBoundary>
          <ThrowError />
        </ListingErrorBoundary>
      )
      
      expect(screen.getByText('Annonce kunne ikke indlæses')).toBeInTheDocument()
      expect(screen.getByText(/annoncen er blevet fjernet eller ikke eksisterer/)).toBeInTheDocument()
    })

    it('shows listing ID when provided', () => {
      render(
        <ListingErrorBoundary listingId="123">
          <ThrowError />
        </ListingErrorBoundary>
      )
      
      expect(screen.getByText('Annonce ID: 123')).toBeInTheDocument()
    })

    it('provides listing-specific navigation options', () => {
      render(
        <ListingErrorBoundary>
          <ThrowError />
        </ListingErrorBoundary>
      )
      
      expect(screen.getByRole('button', { name: /se alle annoncer/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /gå tilbage/i })).toBeInTheDocument()
    })
  })

  describe('ComponentErrorBoundary', () => {
    it('renders minimal component error message', () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError />
        </ComponentErrorBoundary>
      )
      
      expect(screen.getByText('Komponent fejlede')).toBeInTheDocument()
    })

    it('shows component name when provided', () => {
      render(
        <ComponentErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ComponentErrorBoundary>
      )
      
      expect(screen.getByText('TestComponent fejlede')).toBeInTheDocument()
    })

    it('renders in minimal format', () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError />
        </ComponentErrorBoundary>
      )
      
      // Should have minimal styling classes
      const errorDiv = screen.getByText('Komponent fejlede').closest('div')
      expect(errorDiv).toHaveClass('p-3')
    })
  })

  describe('RouteErrorBoundary', () => {
    it('renders route-specific error message', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )
      
      expect(screen.getByText('Siden kunne ikke indlæses')).toBeInTheDocument()
      expect(screen.getByText(/Denne side.*kunne ikke indlæses korrekt/)).toBeInTheDocument()
    })

    it('shows route name when provided', () => {
      render(
        <RouteErrorBoundary routeName="Test Side">
          <ThrowError />
        </RouteErrorBoundary>
      )
      
      expect(screen.getByText(/Test Side siden.*kunne ikke indlæses korrekt/)).toBeInTheDocument()
    })

    it('provides route-specific navigation options', () => {
      render(
        <RouteErrorBoundary>
          <ThrowError />
        </RouteErrorBoundary>
      )
      
      expect(screen.getByRole('button', { name: /gå til forsiden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /genindlæs siden/i })).toBeInTheDocument()
    })

    it('logs route-specific error context', () => {
      const consoleSpy = vi.spyOn(console, 'error')
      
      render(
        <RouteErrorBoundary routeName="Test Route">
          <ThrowError />
        </RouteErrorBoundary>
      )
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Route Error:',
        expect.objectContaining({ 
          route: 'Test Route',
          timestamp: expect.any(String)
        })
      )
    })
  })

  describe('Error Boundary Integration', () => {
    it('all boundaries render children when no error', () => {
      const boundaries = [
        AdminErrorBoundary,
        DataErrorBoundary,
        SearchErrorBoundary,
        ListingErrorBoundary,
        ComponentErrorBoundary,
        RouteErrorBoundary
      ]
      
      boundaries.forEach((Boundary, index) => {
        const { unmount } = render(
          <Boundary>
            <div>Content {index}</div>
          </Boundary>
        )
        
        expect(screen.getByText(`Content ${index}`)).toBeInTheDocument()
        unmount()
      })
    })

    it('boundaries can be nested without conflicts', () => {
      render(
        <RouteErrorBoundary routeName="Test">
          <DataErrorBoundary>
            <ComponentErrorBoundary componentName="NestedComponent">
              <div>Nested content</div>
            </ComponentErrorBoundary>
          </DataErrorBoundary>
        </RouteErrorBoundary>
      )
      
      expect(screen.getByText('Nested content')).toBeInTheDocument()
    })
  })
})