import { render, screen } from '@testing-library/react'
import { LeaseScorePill } from '../LeaseScorePill'

describe('LeaseScorePill - Circular Progress Design', () => {
  it('should render exceptional scores (90+) with dark green color and correct text', () => {
    render(<LeaseScorePill score={95} />)
    
    const scoreElement = screen.getByText('95')
    const descriptorElement = screen.getByText('Exceptionelt tilbud')
    const labelElement = screen.getByText('LeaseScore')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    expect(labelElement).toBeInTheDocument()
    
    // Check score number color (should match the dark green #059669)
    expect(scoreElement).toHaveStyle({ color: '#059669' })
  })

  it('should render great scores (80-89) with light green color and correct text', () => {
    render(<LeaseScorePill score={85} />)
    
    const scoreElement = screen.getByText('85')
    const descriptorElement = screen.getByText('Fantastisk tilbud')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check score number color (should match the light green #84cc16)
    expect(scoreElement).toHaveStyle({ color: '#84cc16' })
  })

  it('should render good scores (60-79) with yellow color and correct text', () => {
    render(<LeaseScorePill score={65} />)
    
    const scoreElement = screen.getByText('65')
    const descriptorElement = screen.getByText('Godt tilbud')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check score number color (should match the yellow #eab308)
    expect(scoreElement).toHaveStyle({ color: '#eab308' })
  })

  it('should render fair scores (40-59) with orange color and correct text', () => {
    render(<LeaseScorePill score={45} />)
    
    const scoreElement = screen.getByText('45')
    const descriptorElement = screen.getByText('Rimeligt tilbud')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check score number color (should match the orange #f97316)
    expect(scoreElement).toHaveStyle({ color: '#f97316' })
  })

  it('should render poor scores (0-39) with red color and correct text', () => {
    render(<LeaseScorePill score={25} />)
    
    const scoreElement = screen.getByText('25')
    const descriptorElement = screen.getByText('Dårligt tilbud')
    
    expect(scoreElement).toBeInTheDocument()
    expect(descriptorElement).toBeInTheDocument()
    
    // Check score number color (should match the red #ef4444)
    expect(scoreElement).toHaveStyle({ color: '#ef4444' })
  })

  it('should render SVG progress circle with correct dimensions', () => {
    render(<LeaseScorePill score={75} size="md" />)
    
    // SVG should be present
    const svgElement = screen.getByRole('img').querySelector('svg')
    expect(svgElement).toBeInTheDocument()
    expect(svgElement).toHaveAttribute('width', '80')
    expect(svgElement).toHaveAttribute('height', '80')
    
    // Should have both background and progress circles
    const circles = screen.getByRole('img').querySelectorAll('circle')
    expect(circles).toHaveLength(2)
    
    // Background circle should be gray
    expect(circles[0]).toHaveAttribute('stroke', '#e5e7eb')
    
    // Progress circle should have color based on score (yellow for 75)
    expect(circles[1]).toHaveAttribute('stroke', '#eab308')
  })

  it('should apply size variants correctly', () => {
    const { rerender } = render(<LeaseScorePill score={85} size="sm" />)
    
    // Small size should be 60px
    let svgElement = screen.getByRole('img').querySelector('svg')
    expect(svgElement).toHaveAttribute('width', '60')
    expect(svgElement).toHaveAttribute('height', '60')
    
    rerender(<LeaseScorePill score={85} size="lg" />)
    
    // Large size should be 100px
    svgElement = screen.getByRole('img').querySelector('svg')
    expect(svgElement).toHaveAttribute('width', '100')
    expect(svgElement).toHaveAttribute('height', '100')
  })

  it('should apply custom className prop', () => {
    render(<LeaseScorePill score={85} className="absolute top-4 right-4" />)
    
    const container = screen.getByRole('img')
    expect(container).toHaveClass('absolute', 'top-4', 'right-4')
  })

  it('should handle edge case scores correctly', () => {
    // Test boundary values for all tiers
    const { rerender } = render(<LeaseScorePill score={40} />)
    expect(screen.getByText('Rimeligt tilbud')).toBeInTheDocument()
    
    rerender(<LeaseScorePill score={60} />)
    expect(screen.getByText('Godt tilbud')).toBeInTheDocument()
    
    rerender(<LeaseScorePill score={80} />)
    expect(screen.getByText('Fantastisk tilbud')).toBeInTheDocument()
    
    rerender(<LeaseScorePill score={90} />)
    expect(screen.getByText('Exceptionelt tilbud')).toBeInTheDocument()
  })

  it('should render with proper accessibility attributes', () => {
    render(<LeaseScorePill score={85} />)
    
    const container = screen.getByRole('img')
    expect(container).toHaveAttribute('role', 'img')
    expect(container).toHaveAttribute('aria-label', 'LeaseScore: 85, Fantastisk tilbud')
  })

  it('should calculate progress correctly for different scores', () => {
    const { rerender } = render(<LeaseScorePill score={0} size="md" />)
    
    // For score 0, progress circle should have maximum offset (no progress shown)
    let progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    const circumference = 2 * Math.PI * 36 // radius for md size
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', circumference.toString())
    
    rerender(<LeaseScorePill score={100} size="md" />)
    
    // For score 100, progress circle should have zero offset (full progress)
    progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', '0')
    
    rerender(<LeaseScorePill score={50} size="md" />)
    
    // For score 50, progress circle should be halfway
    progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    const expectedOffset = circumference - (50 / 100) * circumference
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', expectedOffset.toString())
  })

  it('should apply animation class to progress circle', () => {
    render(<LeaseScorePill score={75} />)
    
    const progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    expect(progressCircle).toHaveClass('transition-all', 'duration-1000', 'ease-out')
  })

  it('should apply glow effect for exceptional scores (90+)', () => {
    const { rerender } = render(<LeaseScorePill score={95} />)
    
    let progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    expect(progressCircle).toHaveStyle({
      filter: 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.4))'
    })
    
    // Should not have glow for lower scores
    rerender(<LeaseScorePill score={85} />)
    
    progressCircle = screen.getByRole('img').querySelectorAll('circle')[1]
    expect(progressCircle).not.toHaveStyle({
      filter: 'drop-shadow(0 0 4px rgba(5, 150, 105, 0.4))'
    })
  })
})