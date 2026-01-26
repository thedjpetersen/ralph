import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import './EmptyState.css';

// Illustration components - minimalist, brand-aligned SVG illustrations

/** Document illustration - clean folder/page style */
export function DocumentIllustration() {
  return (
    <svg
      className="empty-state-illustration"
      viewBox="0 0 120 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Background shape */}
      <ellipse cx="60" cy="90" rx="45" ry="6" fill="var(--color-border-subtle)" />

      {/* Folder back */}
      <path
        d="M20 30c0-3.3 2.7-6 6-6h22l6 8h40c3.3 0 6 2.7 6 6v40c0 3.3-2.7 6-6 6H26c-3.3 0-6-2.7-6-6V30z"
        fill="var(--color-bg-tertiary)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />

      {/* Document page 1 (back) */}
      <rect
        x="32"
        y="28"
        width="36"
        height="44"
        rx="3"
        fill="var(--color-bg-secondary)"
        stroke="var(--color-border)"
        strokeWidth="1"
        transform="rotate(-3 50 50)"
      />

      {/* Document page 2 (front) */}
      <rect
        x="38"
        y="26"
        width="36"
        height="44"
        rx="3"
        fill="var(--color-bg-elevated)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />

      {/* Lines on front page */}
      <line x1="44" y1="36" x2="68" y2="36" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="44" x2="62" y2="44" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="50" x2="66" y2="50" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="44" y1="56" x2="58" y2="56" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Plus sparkle */}
      <circle cx="90" cy="25" r="12" fill="var(--color-accent)" opacity="0.15" />
      <path
        d="M90 20v10M85 25h10"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Comment/chat illustration - speech bubbles style */
export function CommentIllustration() {
  return (
    <svg
      className="empty-state-illustration"
      viewBox="0 0 120 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Background shape */}
      <ellipse cx="60" cy="90" rx="45" ry="6" fill="var(--color-border-subtle)" />

      {/* Large speech bubble (left) */}
      <path
        d="M15 25c0-4.4 3.6-8 8-8h44c4.4 0 8 3.6 8 8v30c0 4.4-3.6 8-8 8H35l-12 10V63h-0c-4.4 0-8-3.6-8-8V25z"
        fill="var(--color-bg-elevated)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />

      {/* Lines in large bubble */}
      <line x1="27" y1="33" x2="63" y2="33" stroke="var(--color-border)" strokeWidth="2" strokeLinecap="round" />
      <line x1="27" y1="42" x2="55" y2="42" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27" y1="51" x2="50" y2="51" stroke="var(--color-border-subtle)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Small speech bubble (right, overlapping) */}
      <path
        d="M65 45c0-3.3 2.7-6 6-6h32c3.3 0 6 2.7 6 6v20c0 3.3-2.7 6-6 6h-6l-8 7V71H71c-3.3 0-6-2.7-6-6V45z"
        fill="var(--color-accent)"
        opacity="0.15"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
      />

      {/* AI sparkle icon in small bubble */}
      <circle cx="86" cy="55" r="3" fill="var(--color-accent)" />
      <path
        d="M86 48v2M86 60v2M79 55h2M91 55h2M81 50l1.5 1.5M89.5 58.5l1.5 1.5M81 60l1.5-1.5M89.5 51.5l1.5-1.5"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Cursor/selection indicator */}
      <rect
        x="27"
        y="31"
        width="36"
        height="6"
        rx="1"
        fill="var(--color-accent)"
        opacity="0.2"
      />
    </svg>
  );
}

/** Search illustration - magnifying glass style */
export function SearchIllustration() {
  return (
    <svg
      className="empty-state-illustration"
      viewBox="0 0 120 100"
      fill="none"
      aria-hidden="true"
    >
      {/* Background shape */}
      <ellipse cx="60" cy="90" rx="45" ry="6" fill="var(--color-border-subtle)" />

      {/* Magnifying glass circle */}
      <circle
        cx="50"
        cy="42"
        r="26"
        fill="var(--color-bg-elevated)"
        stroke="var(--color-border)"
        strokeWidth="2"
      />

      {/* Inner circle highlight */}
      <circle
        cx="50"
        cy="42"
        r="20"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        opacity="0.3"
      />

      {/* Handle */}
      <path
        d="M70 62l18 18"
        stroke="var(--color-border)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M70 62l18 18"
        stroke="var(--color-bg-tertiary)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Question mark or search hint inside */}
      <path
        d="M45 36c0-4 3-7 7-7s7 3 7 7c0 2.5-1.5 4.5-4 5.5v3"
        stroke="var(--color-text-muted)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="1.5" fill="var(--color-text-muted)" />

      {/* Floating suggestion dots */}
      <circle cx="90" cy="25" r="5" fill="var(--color-accent)" opacity="0.2" />
      <circle cx="100" cy="35" r="3" fill="var(--color-accent)" opacity="0.15" />
      <circle cx="95" cy="45" r="4" fill="var(--color-accent)" opacity="0.1" />
    </svg>
  );
}

export interface EmptyStateProps {
  /** Title text displayed prominently */
  title: string;
  /** Description or hint text */
  description?: string;
  /** Custom illustration component */
  illustration?: ReactNode;
  /** Call-to-action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  /** Additional tips or hints to display */
  tips?: string[];
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  tips,
  className = '',
  size = 'medium',
}: EmptyStateProps) {
  return (
    <motion.div
      className={`empty-state empty-state-${size} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {illustration && (
        <motion.div
          className="empty-state-illustration-container"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        >
          {illustration}
        </motion.div>
      )}

      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>

        {description && (
          <p className="empty-state-description">{description}</p>
        )}

        {action && (
          <motion.button
            className={`empty-state-action ${action.variant === 'secondary' ? 'empty-state-action-secondary' : ''}`}
            onClick={action.onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.label}
          </motion.button>
        )}

        {tips && tips.length > 0 && (
          <div className="empty-state-tips">
            <span className="empty-state-tips-label">Tips:</span>
            <ul className="empty-state-tips-list">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

EmptyState.displayName = 'EmptyState';
