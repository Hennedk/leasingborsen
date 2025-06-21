import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

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

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Der opstod en uventet fejl')).toBeInTheDocument()
    expect(screen.getByText(/Vi beklager ulejligheden/)).toBeInTheDocument()
  })

  it('shows retry button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByRole('button', { name: /prøv igen/i })).toBeInTheDocument()
  })

  it('calls onError handler when error occurs', () => {
    const onError = vi.fn()
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    )
  })

  it('renders minimal error UI when minimal prop is true', () => {
    render(
      <ErrorBoundary minimal>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Komponenten kunne ikke indlæses')).toBeInTheDocument()
    expect(screen.getByText(/Der opstod en fejl ved indlæsning af denne del/)).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error fallback')).toBeInTheDocument()
  })

  it('tracks retry count and disables retry after max attempts', () => {
    const { rerender } = render(
      <ErrorBoundary maxRetries={2}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    const retryButton = screen.getByRole('button', { name: /prøv igen/i })
    
    // First retry
    fireEvent.click(retryButton)
    rerender(
      <ErrorBoundary maxRetries={2}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // Second retry
    fireEvent.click(screen.getByRole('button', { name: /prøv igen/i }))
    rerender(
      <ErrorBoundary maxRetries={2}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // Should be disabled after max retries
    expect(screen.getByRole('button', { name: /maks\. forsøg nået/i })).toBeDisabled()
  })

  it('shows error ID in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/Fejl ID:/)).toBeInTheDocument()
    expect(screen.getAllByText(/ERR_/).length).toBeGreaterThan(0)
    
    process.env.NODE_ENV = originalEnv
  })

  it('resets error state when resetKeys change', () => {
    let resetKey = 'key1'
    const { rerender } = render(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // Error state is shown
    expect(screen.getByText('Der opstod en uventet fejl')).toBeInTheDocument()
    
    // Change reset key to trigger reset
    resetKey = 'key2'
    rerender(
      <ErrorBoundary resetKeys={[resetKey]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    // Should render children again
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('provides home and reload navigation options', () => {
    // Mock window methods
    delete (window as any).location
    window.location = { href: '' } as any
    window.location.reload = vi.fn()
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByRole('button', { name: /gå til forsiden/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /genindlæs siden/i })).toBeInTheDocument()
  })

  it('shows detailed error information in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // Check for development details
    expect(screen.getByText(/Tekniske detaljer/)).toBeInTheDocument()
    expect(screen.getByText(/Stack trace:/)).toBeInTheDocument()
    expect(screen.getByText(/Component stack:/)).toBeInTheDocument()
    
    process.env.NODE_ENV = originalEnv
  })
})