import { type ReactNode, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react';
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

  return (
    <div className="table-wrapper" role="region" aria-label="Data table" tabIndex={0}>
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

Table.displayName = 'Table';
TableHead.displayName = 'TableHead';
TableBody.displayName = 'TableBody';
TableFoot.displayName = 'TableFoot';
TableRow.displayName = 'TableRow';
TableHeader.displayName = 'TableHeader';
TableCell.displayName = 'TableCell';
