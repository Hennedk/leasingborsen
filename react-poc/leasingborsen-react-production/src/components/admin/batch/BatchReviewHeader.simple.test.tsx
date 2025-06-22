import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

// Simple test without complex mocks to verify setup works
describe('Simple Test', () => {
  it('basic render test', () => {
    render(
      <BrowserRouter>
        <div data-testid="test-component">Hello World</div>
      </BrowserRouter>
    )

    expect(screen.getByTestId('test-component')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})