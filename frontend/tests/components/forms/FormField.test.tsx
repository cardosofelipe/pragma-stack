/**
 * Tests for FormField Component
 * Verifies form field rendering, accessibility, and error handling
 */

import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/forms/FormField';
import { FieldError } from 'react-hook-form';

describe('FormField', () => {
  describe('Basic Rendering', () => {
    it('renders with label and input', () => {
      render(<FormField label="Email" name="email" type="email" />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<FormField label="Username" name="username" description="Choose a unique username" />);

      expect(screen.getByText('Choose a unique username')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <FormField label="Password" name="password" type="password">
          <p>Password requirements: 8+ characters</p>
        </FormField>
      );

      expect(screen.getByText(/Password requirements/)).toBeInTheDocument();
    });
  });

  describe('Required Field', () => {
    it('shows asterisk when required is true', () => {
      render(<FormField label="Email" name="email" required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not show asterisk when required is false', () => {
      render(<FormField label="Email" name="email" required={false} />);

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Email is required',
      };

      render(<FormField label="Email" name="email" error={error} />);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    it('sets aria-invalid when error exists', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Email is required',
      };

      render(<FormField label="Email" name="email" error={error} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby with error ID when error exists', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Email is required',
      };

      render(<FormField label="Email" name="email" error={error} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
    });

    it('renders error with role="alert"', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Email is required',
      };

      render(<FormField label="Email" name="email" error={error} />);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveTextContent('Email is required');
    });
  });

  describe('Accessibility', () => {
    it('links label to input via htmlFor/id', () => {
      render(<FormField label="Email" name="email" />);

      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');

      expect(label).toHaveAttribute('for', 'email');
      expect(input).toHaveAttribute('id', 'email');
    });

    it('sets aria-describedby with description ID when description exists', () => {
      render(<FormField label="Username" name="username" description="Choose a unique username" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'username-description');
    });

    it('combines error and description IDs in aria-describedby', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Username is required',
      };

      render(
        <FormField
          label="Username"
          name="username"
          description="Choose a unique username"
          error={error}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'username-error username-description');
    });
  });

  describe('Input Props Forwarding', () => {
    it('forwards input props correctly', () => {
      render(
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="Enter your email"
          disabled
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('placeholder', 'Enter your email');
      expect(input).toBeDisabled();
    });

    it('accepts register() props', () => {
      const registerProps = {
        name: 'email',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: jest.fn(),
      };

      render(<FormField label="Email" {...registerProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      // Input ID should match the name from register props
      expect(input).toHaveAttribute('id', 'email');
    });
  });

  describe('Error Cases', () => {
    it('throws error when name is not provided', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<FormField label="Email" name={undefined} />);
      }).toThrow('FormField: name must be provided either explicitly or via register()');

      consoleError.mockRestore();
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct spacing classes', () => {
      const { container } = render(<FormField label="Email" name="email" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-2');
    });

    it('applies correct error styling', () => {
      const error: FieldError = {
        type: 'required',
        message: 'Email is required',
      };

      render(<FormField label="Email" name="email" error={error} />);

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toHaveClass('text-sm', 'text-destructive');
    });

    it('applies correct description styling', () => {
      const { container } = render(
        <FormField label="Email" name="email" description="We'll never share your email" />
      );

      const description = container.querySelector('#email-description');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });
});
