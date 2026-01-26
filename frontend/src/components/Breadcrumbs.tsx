import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Breadcrumbs.css';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  maxLabelLength?: number;
}

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 6l6-4.5L14 6v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 14V8h4v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Route label mapping for friendly names
const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  receipts: 'Receipts',
  transactions: 'Transactions',
  stores: 'Stores',
  budgets: 'Budgets',
  accounts: 'Accounts',
  'financial-accounts': 'Financial Accounts',
  connections: 'Connections',
  settings: 'Settings',
  integrations: 'Integrations',
  profile: 'Profile',
  'api-keys': 'API Keys',
  'retirement-planning': 'Retirement Planning',
  'fire-calculator': 'FIRE Calculator',
  'google-drive': 'Google Drive',
  email: 'Email',
  new: 'New',
  edit: 'Edit',
  documents: 'Documents',
  folders: 'Folders',
};

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);

  // Always start with Home
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/dashboard' }
  ];

  if (pathSegments.length === 0) {
    return breadcrumbs;
  }

  let currentPath = '';

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;

    // Skip adding dashboard since Home already covers it
    if (segment.toLowerCase() === 'dashboard') {
      continue;
    }

    // Try to get a friendly label, fall back to capitalized segment
    const label = labelMap[segment.toLowerCase()] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    breadcrumbs.push({
      label,
      path: currentPath,
    });
  }

  return breadcrumbs;
}

// Truncate label with ellipsis if longer than maxLength
function truncateLabel(label: string, maxLength: number): { truncated: string; isTruncated: boolean } {
  if (label.length <= maxLength) {
    return { truncated: label, isTruncated: false };
  }
  return { truncated: label.slice(0, maxLength - 1) + '\u2026', isTruncated: true };
}

// Tooltip component for showing full label on hover
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  show: boolean;
}

function Tooltip({ content, children, show }: TooltipProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }
  }, [show]);

  return (
    <span ref={triggerRef} className="breadcrumb-tooltip-wrapper">
      {children}
      <AnimatePresence>
        {show && position && (
          <motion.div
            className="breadcrumb-tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              transform: 'translateX(-50%)',
            }}
            role="tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Breadcrumbs({ items, maxLabelLength = 20 }: BreadcrumbsProps) {
  const location = useLocation();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate breadcrumbs from location if not provided
  const displayBreadcrumbs = useMemo(() =>
    items && items.length > 0 ? items : generateBreadcrumbsFromPath(location.pathname),
    [items, location.pathname]
  );

  // Use pathname as key prefix to trigger animations on navigation
  const pathKey = location.pathname;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {displayBreadcrumbs.map((crumb, index) => {
            const isLast = index === displayBreadcrumbs.length - 1;
            const isFirst = index === 0;
            const { truncated, isTruncated } = truncateLabel(crumb.label, maxLabelLength);
            const showTooltip = isTruncated && hoveredIndex === index;

            return (
              <motion.li
                key={`${pathKey}-${crumb.path || index}`}
                className="breadcrumbs-item"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                layout
              >
                {!isLast && crumb.path ? (
                  <>
                    <Tooltip content={crumb.label} show={showTooltip}>
                      {isFirst ? (
                        <Link
                          to={crumb.path}
                          className="breadcrumbs-link breadcrumbs-home"
                          onMouseEnter={() => isTruncated && setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          title={isTruncated ? crumb.label : undefined}
                        >
                          <HomeIcon />
                          <span className="breadcrumbs-home-label">{truncated}</span>
                        </Link>
                      ) : (
                        <Link
                          to={crumb.path}
                          className="breadcrumbs-link"
                          onMouseEnter={() => isTruncated && setHoveredIndex(index)}
                          onMouseLeave={() => setHoveredIndex(null)}
                          title={isTruncated ? crumb.label : undefined}
                        >
                          {truncated}
                        </Link>
                      )}
                    </Tooltip>
                    <motion.span
                      className="breadcrumbs-separator"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15, delay: index * 0.05 + 0.1 }}
                    >
                      <ChevronRightIcon />
                    </motion.span>
                  </>
                ) : (
                  <Tooltip content={crumb.label} show={showTooltip}>
                    <span
                      className="breadcrumbs-current"
                      aria-current="page"
                      onMouseEnter={() => isTruncated && setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      title={isTruncated ? crumb.label : undefined}
                    >
                      {truncated}
                    </span>
                  </Tooltip>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
