import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonButton,
  SkeletonInput,
  SkeletonAvatar,
} from '../Skeleton'

describe('Skeleton', () => {
  it('renders with default class', () => {
    render(<Skeleton />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  it('applies custom width and height', () => {
    render(<Skeleton width={100} height={50} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' })
  })

  it('applies string dimensions', () => {
    render(<Skeleton width="50%" height="2rem" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '50%', height: '2rem' })
  })

  it('applies border radius', () => {
    render(<Skeleton borderRadius={8} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ borderRadius: '8px' })
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-class" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveClass('skeleton', 'custom-class')
  })

  it('applies custom style', () => {
    render(<Skeleton style={{ opacity: 0.5 }} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ opacity: '0.5' })
  })
})

describe('SkeletonText', () => {
  it('renders single line by default', () => {
    render(<SkeletonText />)
    const container = document.querySelector('.skeleton-text')
    expect(container).toBeInTheDocument()
    const skeletons = container?.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(1)
  })

  it('renders multiple lines', () => {
    render(<SkeletonText lines={3} />)
    const container = document.querySelector('.skeleton-text')
    const skeletons = container?.querySelectorAll('.skeleton')
    expect(skeletons).toHaveLength(3)
  })

  it('last line has reduced width when multiple lines', () => {
    render(<SkeletonText lines={3} />)
    const container = document.querySelector('.skeleton-text')
    const skeletons = container?.querySelectorAll('.skeleton')
    // Last line should have 70% width
    expect(skeletons?.[2]).toHaveStyle({ width: '70%' })
    // Other lines should have 100% width
    expect(skeletons?.[0]).toHaveStyle({ width: '100%' })
    expect(skeletons?.[1]).toHaveStyle({ width: '100%' })
  })

  it('single line has full width', () => {
    render(<SkeletonText lines={1} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '100%' })
  })

  it('applies custom className', () => {
    render(<SkeletonText className="custom-text" />)
    const container = document.querySelector('.skeleton-text')
    expect(container).toHaveClass('skeleton-text', 'custom-text')
  })
})

describe('SkeletonButton', () => {
  it('renders with default dimensions', () => {
    render(<SkeletonButton />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '100px', height: '2.5rem', borderRadius: '6px' })
  })

  it('accepts custom width', () => {
    render(<SkeletonButton width={200} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '200px' })
  })

  it('accepts string width', () => {
    render(<SkeletonButton width="100%" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '100%' })
  })

  it('applies custom className', () => {
    render(<SkeletonButton className="custom-button" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveClass('skeleton', 'custom-button')
  })
})

describe('SkeletonInput', () => {
  it('renders with input-like dimensions', () => {
    render(<SkeletonInput />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '100%', height: '2.75rem', borderRadius: '6px' })
  })

  it('applies custom className', () => {
    render(<SkeletonInput className="custom-input" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveClass('skeleton', 'custom-input')
  })
})

describe('SkeletonAvatar', () => {
  it('renders with default size', () => {
    render(<SkeletonAvatar />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '80px', height: '80px', borderRadius: '50%' })
  })

  it('accepts custom size', () => {
    render(<SkeletonAvatar size={40} />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ width: '40px', height: '40px' })
  })

  it('renders as circular', () => {
    render(<SkeletonAvatar />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveStyle({ borderRadius: '50%' })
  })

  it('applies custom className', () => {
    render(<SkeletonAvatar className="custom-avatar" />)
    const skeleton = document.querySelector('.skeleton')
    expect(skeleton).toHaveClass('skeleton', 'custom-avatar')
  })
})
