import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormattedCurrency } from '../FormattedCurrency';

describe('FormattedCurrency', () => {
  describe('Rendering', () => {
    it('renders formatted currency value', () => {
      render(<FormattedCurrency value={1234.56} />);
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<FormattedCurrency value={100} className="custom-class" />);
      expect(screen.getByText('$100.00')).toHaveClass('custom-class');
    });

    it('stores value and currency in data attributes', () => {
      render(<FormattedCurrency value={500} currency="EUR" data-testid="currency" />);
      const element = screen.getByTestId('currency');
      expect(element).toHaveAttribute('data-value', '500');
      expect(element).toHaveAttribute('data-currency', 'EUR');
    });
  });

  describe('Currency Support', () => {
    it('formats USD by default', () => {
      render(<FormattedCurrency value={1000} />);
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    });

    it('formats EUR currency', () => {
      render(<FormattedCurrency value={1000} currency="EUR" locale="de-DE" />);
      // Euro uses comma as decimal separator in German locale
      expect(screen.getByText(/1\.000,00\s*€/)).toBeInTheDocument();
    });

    it('formats GBP currency', () => {
      render(<FormattedCurrency value={1000} currency="GBP" locale="en-GB" />);
      expect(screen.getByText('£1,000.00')).toBeInTheDocument();
    });

    it('formats JPY currency (no decimals)', () => {
      render(<FormattedCurrency value={1000} currency="JPY" locale="ja-JP" data-testid="currency" />);
      // JPY typically doesn't have decimal places, yen symbol can be ¥ or ￥
      const element = screen.getByTestId('currency');
      expect(element.textContent).toMatch(/[¥￥]1,000/);
    });

    it('formats CAD currency', () => {
      render(<FormattedCurrency value={1000} currency="CAD" locale="en-CA" data-testid="currency" />);
      // CAD format varies by locale/browser
      const element = screen.getByTestId('currency');
      expect(element.textContent).toMatch(/\$1,000\.00/);
    });

    it('formats AUD currency', () => {
      render(<FormattedCurrency value={1000} currency="AUD" locale="en-AU" data-testid="currency" />);
      // AUD format varies by locale/browser
      const element = screen.getByTestId('currency');
      expect(element.textContent).toMatch(/\$1,000\.00/);
    });
  });

  describe('Compact Format', () => {
    it('does not use compact notation by default', () => {
      render(<FormattedCurrency value={1500000} />);
      expect(screen.getByText('$1,500,000.00')).toBeInTheDocument();
    });

    it('uses compact notation for thousands when enabled', () => {
      render(<FormattedCurrency value={1500} compact />);
      expect(screen.getByText(/\$1\.5K/)).toBeInTheDocument();
    });

    it('uses compact notation for millions when enabled', () => {
      render(<FormattedCurrency value={1500000} compact />);
      expect(screen.getByText(/\$1\.5M/)).toBeInTheDocument();
    });

    it('uses compact notation for billions when enabled', () => {
      render(<FormattedCurrency value={1500000000} compact />);
      expect(screen.getByText(/\$1\.5B/)).toBeInTheDocument();
    });
  });

  describe('Positive/Negative Coloring', () => {
    it('does not apply color classes by default', () => {
      render(<FormattedCurrency value={100} data-testid="currency" />);
      const element = screen.getByTestId('currency');
      expect(element).not.toHaveClass('formatted-currency-positive');
      expect(element).not.toHaveClass('formatted-currency-negative');
    });

    it('applies positive color class for positive values when colorize is true', () => {
      render(<FormattedCurrency value={100} colorize data-testid="currency" />);
      expect(screen.getByTestId('currency')).toHaveClass('formatted-currency-positive');
    });

    it('applies negative color class for negative values when colorize is true', () => {
      render(<FormattedCurrency value={-100} colorize data-testid="currency" />);
      expect(screen.getByTestId('currency')).toHaveClass('formatted-currency-negative');
    });

    it('does not apply color class for zero values when colorize is true', () => {
      render(<FormattedCurrency value={0} colorize data-testid="currency" />);
      const element = screen.getByTestId('currency');
      expect(element).not.toHaveClass('formatted-currency-positive');
      expect(element).not.toHaveClass('formatted-currency-negative');
    });
  });

  describe('Sign Display', () => {
    it('does not show plus sign for positive values by default', () => {
      render(<FormattedCurrency value={100} />);
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('shows plus sign for positive values when showSign is true', () => {
      render(<FormattedCurrency value={100} showSign />);
      expect(screen.getByText('+$100.00')).toBeInTheDocument();
    });

    it('shows minus sign for negative values', () => {
      render(<FormattedCurrency value={-100} />);
      expect(screen.getByText('-$100.00')).toBeInTheDocument();
    });

    it('does not show sign for zero', () => {
      render(<FormattedCurrency value={0} showSign />);
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<FormattedCurrency value={100} data-testid="currency" />);
      expect(screen.getByTestId('currency')).toHaveClass('formatted-currency-md');
    });

    it('applies small size', () => {
      render(<FormattedCurrency value={100} size="sm" data-testid="currency" />);
      expect(screen.getByTestId('currency')).toHaveClass('formatted-currency-sm');
    });

    it('applies large size', () => {
      render(<FormattedCurrency value={100} size="lg" data-testid="currency" />);
      expect(screen.getByTestId('currency')).toHaveClass('formatted-currency-lg');
    });
  });

  describe('Decimal Places', () => {
    it('uses default decimal places for currency', () => {
      render(<FormattedCurrency value={100} />);
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('respects custom decimal places', () => {
      render(<FormattedCurrency value={100.1234} decimals={4} />);
      expect(screen.getByText('$100.1234')).toBeInTheDocument();
    });

    it('shows no decimals when decimals is 0', () => {
      render(<FormattedCurrency value={100.99} decimals={0} />);
      expect(screen.getByText('$101')).toBeInTheDocument();
    });
  });

  describe('Locale Support', () => {
    it('uses en-US locale by default', () => {
      render(<FormattedCurrency value={1234.56} />);
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('supports German locale formatting', () => {
      render(<FormattedCurrency value={1234.56} currency="EUR" locale="de-DE" />);
      // German uses period for thousands separator and comma for decimal
      expect(screen.getByText(/1\.234,56\s*€/)).toBeInTheDocument();
    });

    it('supports French locale formatting', () => {
      render(<FormattedCurrency value={1234.56} currency="EUR" locale="fr-FR" />);
      // French uses non-breaking space for thousands separator
      expect(screen.getByText(/1[\s\u202F]234,56\s*€/)).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to span element', () => {
      const ref = vi.fn();
      render(<FormattedCurrency value={100} ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<FormattedCurrency value={100} data-testid="custom-currency" />);
      expect(screen.getByTestId('custom-currency')).toBeInTheDocument();
    });

    it('passes through id attribute', () => {
      render(<FormattedCurrency value={100} id="my-currency" />);
      expect(document.getElementById('my-currency')).toBeInTheDocument();
    });

    it('passes through aria-label', () => {
      render(<FormattedCurrency value={100} aria-label="Price value" />);
      expect(screen.getByLabelText('Price value')).toBeInTheDocument();
    });
  });
});
