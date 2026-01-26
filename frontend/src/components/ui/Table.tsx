import { type ReactNode, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes, useRef, useEffect, useState, useCallback } from 'react';
import './Table.css';

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

export function Table({
  children,
  striped = false,
  hoverable = false,
  bordered = false,
  compact = false,
  className = '',
  ...props
}: TableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const { scrollLeft, scrollWidth, clientWidth } = wrapper;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Initial check
    updateScrollIndicators();

    // Listen for scroll events
    wrapper.addEventListener('scroll', updateScrollIndicators);

    // Listen for resize events
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(wrapper);

    return () => {
      wrapper.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators]);

  const classes = [
    'table',
    striped && 'table-striped',
    hoverable && 'table-hoverable',
    bordered && 'table-bordered',
    compact && 'table-compact',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [
    'table-wrapper',
    canScrollLeft && 'can-scroll-left',
    canScrollRight && 'can-scroll-right',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapperRef}
      className={wrapperClasses}
      role="region"
      aria-label="Data table"
      tabIndex={0}
    >
      <table className={classes} {...props}>
        {children}
      </table>
    </div>
  );
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export function TableHead({ children, className = '', ...props }: TableHeadProps) {
  return (
    <thead className={`table-head ${className}`.trim()} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export function TableBody({ children, className = '', ...props }: TableBodyProps) {
  return (
    <tbody className={`table-body ${className}`.trim()} {...props}>
      {children}
    </tbody>
  );
}

export interface TableFootProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export function TableFoot({ children, className = '', ...props }: TableFootProps) {
  return (
    <tfoot className={`table-foot ${className}`.trim()} {...props}>
      {children}
    </tfoot>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  selected?: boolean;
}

export function TableRow({ children, selected = false, className = '', ...props }: TableRowProps) {
  const classes = [
    'table-row',
    selected && 'table-row-selected',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={classes} aria-selected={selected || undefined} {...props}>
      {children}
    </tr>
  );
}

export interface TableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

export function TableHeader({
  children,
  sortable = false,
  sorted = false,
  onSort,
  className = '',
  ...props
}: TableHeaderProps) {
  const classes = [
    'table-header',
    sortable && 'table-header-sortable',
    sorted && `table-header-sorted-${sorted}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sortable && onSort && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSort();
    }
  };

  return (
    <th
      className={classes}
      onClick={sortable ? onSort : undefined}
      onKeyDown={sortable ? handleKeyDown : undefined}
      tabIndex={sortable ? 0 : undefined}
      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
      role={sortable ? 'columnheader button' : undefined}
      {...props}
    >
      <span className="table-header-content">
        {children}
        {sortable && (
          <span className="table-sort-icon" aria-hidden="true">
            {sorted === 'asc' && (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path d="M10 6l-5 5h10l-5-5z" />
              </svg>
            )}
            {sorted === 'desc' && (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path d="M10 14l5-5H5l5 5z" />
              </svg>
            )}
            {!sorted && (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" opacity="0.4">
                <path d="M10 6l-5 5h10l-5-5z" />
                <path d="M10 14l5-5H5l5 5z" />
              </svg>
            )}
          </span>
        )}
      </span>
    </th>
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({
  children,
  align = 'left',
  className = '',
  ...props
}: TableCellProps) {
  const classes = [
    'table-cell',
    `table-cell-${align}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <td className={classes} {...props}>
      {children}
    </td>
  );
}

Table.Head = TableHead;
Table.Body = TableBody;
Table.Foot = TableFoot;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;

// Pagination component
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  showInfo?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = true,
  showInfo = true,
  className = '',
}: PaginationProps) {
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onPageSizeChange) {
      onPageSizeChange(parseInt(e.target.value, 10));
    }
  };

  const handleFirstPage = () => onPageChange(1);
  const handlePrevPage = () => onPageChange(currentPage - 1);
  const handleNextPage = () => onPageChange(currentPage + 1);
  const handleLastPage = () => onPageChange(totalPages);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav
      className={`table-pagination ${className}`.trim()}
      aria-label="Table pagination"
    >
      {showInfo && (
        <div className="table-pagination-info" aria-live="polite">
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}
      <div className="table-pagination-controls">
        {showPageSizeSelector && onPageSizeChange && (
          <>
            <label htmlFor="table-page-size" className="sr-only">
              Results per page
            </label>
            <select
              id="table-page-size"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="table-page-size-select"
              aria-label="Results per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </>
        )}
        <div className="table-pagination-buttons" role="group" aria-label="Page navigation">
          <button
            onClick={handleFirstPage}
            disabled={isFirstPage}
            className="table-pagination-button"
            aria-label="Go to first page"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414z" />
              <path d="M9.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
          </button>
          <button
            onClick={handlePrevPage}
            disabled={isFirstPage}
            className="table-pagination-button"
            aria-label="Go to previous page"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
          </button>
          <span className="table-page-indicator" aria-current="page">
            {currentPage} / {totalPages || 1}
          </span>
          <button
            onClick={handleNextPage}
            disabled={isLastPage}
            className="table-pagination-button"
            aria-label="Go to next page"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
          <button
            onClick={handleLastPage}
            disabled={isLastPage}
            className="table-pagination-button"
            aria-label="Go to last page"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M4.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              <path d="M10.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L14.586 10l-4.293-4.293a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

Table.Head = TableHead;
Table.Body = TableBody;
Table.Foot = TableFoot;
Table.Row = TableRow;
Table.Header = TableHeader;
Table.Cell = TableCell;
Table.Pagination = Pagination;

Table.displayName = 'Table';
TableHead.displayName = 'TableHead';
TableBody.displayName = 'TableBody';
TableFoot.displayName = 'TableFoot';
TableRow.displayName = 'TableRow';
TableHeader.displayName = 'TableHeader';
TableCell.displayName = 'TableCell';
Pagination.displayName = 'Pagination';
