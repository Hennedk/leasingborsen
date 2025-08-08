import { render, screen } from '@testing-library/react'
import { LeaseScorePill } from '../LeaseScorePill'

describe('LeaseScorePill', () => {
  it('should render score with correct color for excellent scores (85+)', () => {
    render(<LeaseScorePill score={85} />)
    
    const scoreElement = screen.getByText('85')
    const descriptorElement = screen.getByText('Fantastisk værdi')
    const labelElement = screen.getByText('LeaseScore')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    expect(labelElement).toBeInTheDocument()
    
    // Check if score circle has green background
    expect(scoreElement.closest('div')).toHaveClass('bg-green-500')
  })

  it('should render score with correct color for good scores (70-84)', () => {
    render(<LeaseScorePill score={75} />)
    
    const scoreElement = screen.getByText('75')
    const descriptorElement = screen.getByText('God værdi')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check if score circle has yellow background
    expect(scoreElement.closest('div')).toHaveClass('bg-yellow-500')
  })

  it('should render score with correct color for fair scores (60-69)', () => {
    render(<LeaseScorePill score={65} />)
    
    const scoreElement = screen.getByText('65')
    const descriptorElement = screen.getByText('Rimelig værdi')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check if score circle has orange background
    expect(scoreElement.closest('div')).toHaveClass('bg-orange-500')
  })

  it('should not render for low scores (<60)', () => {
    const { container } = render(<LeaseScorePill score={45} />)
    
    expect(container.firstChild).toBeNull()
  })

  it('should apply size variants correctly', () => {
    const { rerender } = render(<LeaseScorePill score={85} size="sm" />)
    
    let container = screen.getByRole('img')
    expect(container).toHaveClass('px-3', 'py-1')
    
    rerender(<LeaseScorePill score={85} size="lg" />)
    
    container = screen.getByRole('img')
    expect(container).toHaveClass('px-6', 'py-3')
  })

  it('should apply custom className prop', () => {
    render(<LeaseScorePill score={85} className="absolute top-4 right-4" />)
    
    const container = screen.getByRole('img')
    expect(container).toHaveClass('absolute', 'top-4', 'right-4')
  })

  it('should handle edge case scores correctly', () => {
    // Test boundary values
    const { rerender } = render(<LeaseScorePill score={60} />)
    expect(screen.getByText('Rimelig værdi')).toBeInTheDocument()
    
    rerender(<LeaseScorePill score={70} />)
    expect(screen.getByText('God værdi')).toBeInTheDocument()
    
    rerender(<LeaseScorePill score={85} />)
    expect(screen.getByText('Fantastisk værdi')).toBeInTheDocument()
  })

  it('should render with proper accessibility attributes', () => {
    render(<LeaseScorePill score={85} />)
    
    const container = screen.getByRole('img')
    expect(container).toHaveAttribute('role', 'img')
    expect(container).toHaveAttribute('aria-label', 'LeaseScore: 85, Fantastisk værdi')
  })
})