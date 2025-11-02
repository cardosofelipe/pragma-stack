/**
 * Tests for Home Page
 * Smoke tests for static content
 */

import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<Home />);
    expect(screen.getByText(/get started by editing/i)).toBeInTheDocument();
  });

  it('renders Next.js logo', () => {
    render(<Home />);

    const logo = screen.getByAltText('Next.js logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/next.svg');
  });

  it('renders Vercel logo', () => {
    render(<Home />);

    const logo = screen.getByAltText('Vercel logomark');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/vercel.svg');
  });

  it('has correct external links', () => {
    render(<Home />);

    const deployLink = screen.getByRole('link', { name: /deploy now/i });
    expect(deployLink).toHaveAttribute('href', expect.stringContaining('vercel.com'));
    expect(deployLink).toHaveAttribute('target', '_blank');
    expect(deployLink).toHaveAttribute('rel', 'noopener noreferrer');

    const docsLink = screen.getByRole('link', { name: /read our docs/i });
    expect(docsLink).toHaveAttribute('href', expect.stringContaining('nextjs.org/docs'));
    expect(docsLink).toHaveAttribute('target', '_blank');
  });

  it('renders footer links', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /learn/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /examples/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to nextjs\.org/i })).toBeInTheDocument();
  });

  it('has accessible image alt texts', () => {
    render(<Home />);

    expect(screen.getByAltText('Next.js logo')).toBeInTheDocument();
    expect(screen.getByAltText('Vercel logomark')).toBeInTheDocument();
    expect(screen.getByAltText('File icon')).toBeInTheDocument();
    expect(screen.getByAltText('Window icon')).toBeInTheDocument();
    expect(screen.getByAltText('Globe icon')).toBeInTheDocument();
  });
});
