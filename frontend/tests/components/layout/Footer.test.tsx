/**
 * Tests for Footer Component
 * Verifies footer rendering and content
 */

import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/layout/Footer';

describe('Footer', () => {
  describe('Rendering', () => {
    it('renders footer element', () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('displays copyright text with current year', () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      expect(
        screen.getByText(`© ${currentYear} FastNext Template. All rights reserved.`)
      ).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
      const { container } = render(<Footer />);

      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('bg-muted/30');
    });
  });
});
