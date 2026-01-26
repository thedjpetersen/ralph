import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Table,
  TableHead,
  TableBody,
  TableFoot,
  TableRow,
  TableHeader,
  TableCell,
  Pagination,
} from '../Table';

describe('Table', () => {
  describe('Basic Rendering', () => {
    it('renders a table element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('renders within a scrollable wrapper', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const wrapper = screen.getByRole('region', { name: 'Data table' });
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('table-wrapper');
    });

    it('wrapper is focusable for keyboard scrolling', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const wrapper = screen.getByRole('region');
      expect(wrapper).toHaveAttribute('tabindex', '0');
    });

    it('applies custom className', () => {
      render(
        <Table className="custom-table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toHaveClass('custom-table');
    });
  });

  describe('Table Variants', () => {
    it('applies striped variant', () => {
      render(
        <Table striped>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toHaveClass('table-striped');
    });

    it('applies hoverable variant', () => {
      render(
        <Table hoverable>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toHaveClass('table-hoverable');
    });

    it('applies bordered variant', () => {
      render(
        <Table bordered>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toHaveClass('table-bordered');
    });

    it('applies compact variant', () => {
      render(
        <Table compact>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('table')).toHaveClass('table-compact');
    });

    it('applies multiple variants', () => {
      render(
        <Table striped hoverable bordered compact>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const table = screen.getByRole('table');
      expect(table).toHaveClass('table-striped');
      expect(table).toHaveClass('table-hoverable');
      expect(table).toHaveClass('table-bordered');
      expect(table).toHaveClass('table-compact');
    });
  });

  describe('TableHead', () => {
    it('renders thead element', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Header</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByRole('rowgroup')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableHead className="custom-head">
            <TableRow>
              <TableHeader>Header</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(document.querySelector('.custom-head')).toBeInTheDocument();
    });
  });

  describe('TableBody', () => {
    it('renders tbody element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('rowgroup')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody className="custom-body">
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(document.querySelector('.custom-body')).toBeInTheDocument();
    });
  });

  describe('TableFoot', () => {
    it('renders tfoot element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
          <TableFoot>
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFoot>
        </Table>
      );
      // tfoot is also a rowgroup
      const rowgroups = screen.getAllByRole('rowgroup');
      expect(rowgroups.length).toBe(2);
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
          <TableFoot className="custom-foot">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFoot>
        </Table>
      );
      expect(document.querySelector('.custom-foot')).toBeInTheDocument();
    });
  });

  describe('TableRow', () => {
    it('renders tr element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('row')).toBeInTheDocument();
    });

    it('applies selected state', () => {
      render(
        <Table>
          <TableBody>
            <TableRow selected>
              <TableCell>Selected</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const row = screen.getByRole('row');
      expect(row).toHaveClass('table-row-selected');
      expect(row).toHaveAttribute('aria-selected', 'true');
    });

    it('does not have aria-selected when not selected', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Not Selected</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('row')).not.toHaveAttribute('aria-selected');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow className="custom-row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('row')).toHaveClass('custom-row');
    });
  });

  describe('TableHeader', () => {
    it('renders th element', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Header</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByRole('columnheader')).toBeInTheDocument();
    });

    it('renders header text', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="custom-header">Header</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('custom-header');
    });
  });

  describe('Sortable Headers', () => {
    it('applies sortable class when sortable', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable>Sortable</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByRole('columnheader')).toHaveClass('table-header-sortable');
    });

    it('is focusable when sortable', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable>Sortable</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      const header = screen.getByRole('columnheader');
      expect(header).toHaveAttribute('tabindex', '0');
    });

    it('is not focusable when not sortable', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Not Sortable</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      const header = screen.getByRole('columnheader');
      expect(header).not.toHaveAttribute('tabindex');
    });

    it('calls onSort when clicked', () => {
      const handleSort = vi.fn();
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable onSort={handleSort}>
                Sortable
              </TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      fireEvent.click(screen.getByRole('columnheader'));
      expect(handleSort).toHaveBeenCalledTimes(1);
    });

    it('calls onSort on Enter key', () => {
      const handleSort = vi.fn();
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable onSort={handleSort}>
                Sortable
              </TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      fireEvent.keyDown(screen.getByRole('columnheader'), { key: 'Enter' });
      expect(handleSort).toHaveBeenCalledTimes(1);
    });

    it('calls onSort on Space key', () => {
      const handleSort = vi.fn();
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable onSort={handleSort}>
                Sortable
              </TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      fireEvent.keyDown(screen.getByRole('columnheader'), { key: ' ' });
      expect(handleSort).toHaveBeenCalledTimes(1);
    });

    it('shows ascending sort indicator', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable sorted="asc">
                Ascending
              </TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      const header = screen.getByRole('columnheader');
      expect(header).toHaveClass('table-header-sorted-asc');
      expect(header).toHaveAttribute('aria-sort', 'ascending');
    });

    it('shows descending sort indicator', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable sorted="desc">
                Descending
              </TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      const header = screen.getByRole('columnheader');
      expect(header).toHaveClass('table-header-sorted-desc');
      expect(header).toHaveAttribute('aria-sort', 'descending');
    });

    it('does not have aria-sort when not sorted', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader sortable>Unsorted</TableHeader>
            </TableRow>
          </TableHead>
        </Table>
      );
      expect(screen.getByRole('columnheader')).not.toHaveAttribute('aria-sort');
    });
  });

  describe('TableCell', () => {
    it('renders td element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toBeInTheDocument();
    });

    it('renders cell content', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('applies left alignment by default', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Left</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toHaveClass('table-cell-left');
    });

    it('applies center alignment', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell align="center">Center</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toHaveClass('table-cell-center');
    });

    it('applies right alignment', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell align="right">Right</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toHaveClass('table-cell-right');
    });

    it('applies custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toHaveClass('custom-cell');
    });

    it('supports colSpan', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={3}>Spanning</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('cell')).toHaveAttribute('colspan', '3');
    });

    it('supports rowSpan', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell rowSpan={2}>Spanning</TableCell>
              <TableCell>Other</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getAllByRole('cell')[0]).toHaveAttribute('rowspan', '2');
    });
  });

  describe('Compound Component Pattern', () => {
    it('supports Table.Head syntax', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Header>Header</Table.Header>
            </Table.Row>
          </Table.Head>
        </Table>
      );
      expect(screen.getByRole('columnheader')).toBeInTheDocument();
    });

    it('supports full compound component structure', () => {
      render(
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Header>Name</Table.Header>
              <Table.Header>Age</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            <Table.Row>
              <Table.Cell>John</Table.Cell>
              <Table.Cell>30</Table.Cell>
            </Table.Row>
          </Table.Body>
          <Table.Foot>
            <Table.Row>
              <Table.Cell colSpan={2}>Total: 1</Table.Cell>
            </Table.Row>
          </Table.Foot>
        </Table>
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Total: 1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('wrapper has region role', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('wrapper has accessible name', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Data table');
    });

    it('wrapper is keyboard scrollable', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      const wrapper = screen.getByRole('region');
      wrapper.focus();
      expect(document.activeElement).toBe(wrapper);
    });

    it('table has proper structure for screen readers', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Header 1</TableHeader>
              <TableHeader>Header 2</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Data 1</TableCell>
              <TableCell>Data 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );
      expect(screen.getAllByRole('columnheader')).toHaveLength(2);
      expect(screen.getAllByRole('cell')).toHaveLength(2);
      expect(screen.getAllByRole('row')).toHaveLength(2);
    });
  });

  describe('Empty Table', () => {
    it('renders empty tbody', () => {
      render(
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Header</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody />
        </Table>
      );
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders pagination navigation', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByRole('navigation', { name: 'Table pagination' })).toBeInTheDocument();
    });

    it('shows item count info by default', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByText('Showing 1-10 of 100 items')).toBeInTheDocument();
    });

    it('shows page indicator', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Pagination {...defaultProps} className="custom-pagination" />);
      expect(screen.getByRole('navigation')).toHaveClass('custom-pagination');
    });
  });

  describe('Navigation Buttons', () => {
    it('renders all navigation buttons', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to last page' })).toBeInTheDocument();
    });

    it('disables first and previous buttons on first page', () => {
      render(<Pagination {...defaultProps} currentPage={1} />);
      expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to next page' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to last page' })).not.toBeDisabled();
    });

    it('disables next and last buttons on last page', () => {
      render(<Pagination {...defaultProps} currentPage={10} />);
      expect(screen.getByRole('button', { name: 'Go to first page' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to previous page' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
    });

    it('calls onPageChange with correct page when clicking buttons', () => {
      const onPageChange = vi.fn();
      render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
      expect(onPageChange).toHaveBeenCalledWith(1);

      fireEvent.click(screen.getByRole('button', { name: 'Go to previous page' }));
      expect(onPageChange).toHaveBeenCalledWith(4);

      fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
      expect(onPageChange).toHaveBeenCalledWith(6);

      fireEvent.click(screen.getByRole('button', { name: 'Go to last page' }));
      expect(onPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('Page Size Selector', () => {
    it('renders page size selector by default', () => {
      const onPageSizeChange = vi.fn();
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);
      expect(screen.getByRole('combobox', { name: 'Results per page' })).toBeInTheDocument();
    });

    it('does not render page size selector when showPageSizeSelector is false', () => {
      render(<Pagination {...defaultProps} showPageSizeSelector={false} />);
      expect(screen.queryByRole('combobox', { name: 'Results per page' })).not.toBeInTheDocument();
    });

    it('does not render page size selector when onPageSizeChange is not provided', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.queryByRole('combobox', { name: 'Results per page' })).not.toBeInTheDocument();
    });

    it('renders default page size options', () => {
      const onPageSizeChange = vi.fn();
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);
      const select = screen.getByRole('combobox', { name: 'Results per page' });
      expect(select).toHaveValue('10');
      expect(screen.getByRole('option', { name: '10 per page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '20 per page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '50 per page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '100 per page' })).toBeInTheDocument();
    });

    it('renders custom page size options', () => {
      const onPageSizeChange = vi.fn();
      render(
        <Pagination
          {...defaultProps}
          pageSizeOptions={[5, 15, 25]}
          onPageSizeChange={onPageSizeChange}
        />
      );
      expect(screen.getByRole('option', { name: '5 per page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '15 per page' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '25 per page' })).toBeInTheDocument();
    });

    it('calls onPageSizeChange when selection changes', () => {
      const onPageSizeChange = vi.fn();
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);
      const select = screen.getByRole('combobox', { name: 'Results per page' });

      fireEvent.change(select, { target: { value: '50' } });
      expect(onPageSizeChange).toHaveBeenCalledWith(50);
    });
  });

  describe('Info Display', () => {
    it('hides info when showInfo is false', () => {
      render(<Pagination {...defaultProps} showInfo={false} />);
      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });

    it('shows correct range for middle page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />);
      expect(screen.getByText('Showing 41-50 of 100 items')).toBeInTheDocument();
    });

    it('shows correct range for last page with fewer items', () => {
      render(<Pagination {...defaultProps} currentPage={10} totalItems={95} />);
      expect(screen.getByText('Showing 91-95 of 95 items')).toBeInTheDocument();
    });

    it('handles single item correctly', () => {
      render(<Pagination {...defaultProps} totalItems={1} totalPages={1} />);
      expect(screen.getByText('Showing 1-1 of 1 items')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero total pages', () => {
      render(<Pagination {...defaultProps} totalPages={0} totalItems={0} />);
      expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('handles single page', () => {
      render(<Pagination {...defaultProps} totalPages={1} totalItems={5} />);
      expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
    });
  });

  describe('Table.Pagination Compound Component', () => {
    it('can be used as Table.Pagination', () => {
      render(
        <Table.Pagination
          currentPage={1}
          totalPages={5}
          totalItems={50}
          pageSize={10}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByRole('navigation', { name: 'Table pagination' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper navigation landmark', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Table pagination');
    });

    it('has aria-live region for info', () => {
      render(<Pagination {...defaultProps} />);
      const info = screen.getByText(/Showing/);
      expect(info).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-current on page indicator', () => {
      render(<Pagination {...defaultProps} />);
      const indicator = screen.getByText('1 / 10');
      expect(indicator).toHaveAttribute('aria-current', 'page');
    });

    it('page navigation buttons have proper group role', () => {
      render(<Pagination {...defaultProps} />);
      expect(screen.getByRole('group', { name: 'Page navigation' })).toBeInTheDocument();
    });
  });
});
