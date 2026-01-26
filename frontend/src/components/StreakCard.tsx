import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWritingStreakStore } from '../stores/writingStreak';
import './StreakCard.css';

// Fire icon with optional animation
interface FireIconProps {
  animated?: boolean;
  size?: number;
}

function FireIcon({ animated = false, size = 20 }: FireIconProps) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="streak-fire-icon"
      aria-hidden="true"
    >
      <path
        d="M12 2C8.5 6 4 9 4 14a8 8 0 0 0 16 0c0-5-4.5-8-8-12zm0 18a6 6 0 0 1-6-6c0-3.5 3-6 6-9 3 3 6 5.5 6 9a6 6 0 0 1-6 6z"
        fill="currentColor"
      />
      <path
        d="M12 20c-2.21 0-4-1.79-4-4 0-2.5 2-4 4-6 2 2 4 3.5 4 6 0 2.21-1.79 4-4 4z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );

  if (animated) {
    return (
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [-3, 3, -3],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="streak-fire-animated"
      >
        {icon}
      </motion.div>
    );
  }

  return icon;
}

interface StreakCardProps {
  isCollapsed?: boolean;
}

export function StreakCard({ isCollapsed = false }: StreakCardProps) {
  const currentStreak = useWritingStreakStore((state) => state.currentStreak);
  const settings = useWritingStreakStore((state) => state.settings);
  const openCalendar = useWritingStreakStore((state) => state.openCalendar);
  const getTodayProgress = useWritingStreakStore((state) => state.getTodayProgress);
  const getStreakStatus = useWritingStreakStore((state) => state.getStreakStatus);

  const todayProgress = useMemo(() => getTodayProgress(), [getTodayProgress]);
  const streakStatus = useMemo(() => getStreakStatus(), [getStreakStatus]);

  // Don't render if streak tracking is disabled
  if (!settings.enabled) {
    return null;
  }

  const hasStreak = currentStreak > 0;
  const isActive = streakStatus === 'active';
  const isAtRisk = streakStatus === 'at_risk';

  // Collapsed view - just show icon and count
  if (isCollapsed) {
    return (
      <button
        className={`streak-card streak-card-collapsed ${hasStreak ? 'has-streak' : ''} ${isActive ? 'streak-active' : ''}`}
        onClick={openCalendar}
        title={`${currentStreak} day streak - Click to view history`}
        aria-label={`Writing streak: ${currentStreak} days. Click to view history.`}
      >
        <FireIcon animated={isActive} size={18} />
        {hasStreak && <span className="streak-count-mini">{currentStreak}</span>}
      </button>
    );
  }

  return (
    <button
      className={`streak-card ${hasStreak ? 'has-streak' : ''} ${isActive ? 'streak-active' : ''} ${isAtRisk ? 'streak-at-risk' : ''}`}
      onClick={openCalendar}
      aria-label={`Writing streak: ${currentStreak} days. Today's progress: ${todayProgress.wordCount} of ${todayProgress.goal} words. Click to view history.`}
    >
      <div className="streak-card-header">
        <div className="streak-icon-container">
          <FireIcon animated={isActive} size={22} />
        </div>
        <div className="streak-info">
          <span className="streak-count">{currentStreak}</span>
          <span className="streak-label">{currentStreak === 1 ? 'day' : 'days'}</span>
        </div>
        {isAtRisk && (
          <span className="streak-badge streak-badge-warning" title="Write today to keep your streak!">
            !
          </span>
        )}
        {isActive && hasStreak && (
          <AnimatePresence>
            <motion.span
              className="streak-badge streak-badge-active"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              ✓
            </motion.span>
          </AnimatePresence>
        )}
      </div>

      {/* Progress bar */}
      <div className="streak-progress-container">
        <div className="streak-progress-bar">
          <motion.div
            className="streak-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${todayProgress.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="streak-progress-text">
          <span className="streak-progress-count">{todayProgress.wordCount}</span>
          <span className="streak-progress-divider">/</span>
          <span className="streak-progress-goal">{todayProgress.goal}</span>
        </div>
      </div>
    </button>
  );
}
