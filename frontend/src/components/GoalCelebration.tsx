import { useEffect, useSyncExternalStore, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWritingStreakStore, useTodayGoalJustCompleted } from '../stores/writingStreak';
import './GoalCelebration.css';

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

// Generate deterministic but varied values based on index
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// Confetti particle component
function ConfettiParticle({ index, prefersReducedMotion }: { index: number; prefersReducedMotion: boolean }) {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const color = colors[index % colors.length];

  // Use seeded random values based on index to keep them deterministic
  const randomX = useMemo(() => seededRandom(index * 1) * 200 - 100, [index]);
  const randomRotation = useMemo(() => seededRandom(index * 2) * 720 - 360, [index]);
  const randomDelay = useMemo(() => seededRandom(index * 3) * 0.3, [index]);
  const size = useMemo(() => 6 + seededRandom(index * 4) * 6, [index]);
  const isCircle = useMemo(() => seededRandom(index * 5) > 0.5, [index]);
  const yDistance = useMemo(() => -100 - seededRandom(index * 6) * 100, [index]);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <motion.div
      className="confetti-particle"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        borderRadius: isCircle ? '50%' : '2px',
      }}
      initial={{
        opacity: 1,
        y: 0,
        x: 0,
        rotate: 0,
        scale: 0,
      }}
      animate={{
        opacity: [1, 1, 0],
        y: [-20, yDistance],
        x: randomX,
        rotate: randomRotation,
        scale: [0, 1, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        delay: randomDelay,
        ease: [0.2, 0.8, 0.4, 1],
      }}
    />
  );
}

// Star burst decoration
function StarBurst({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="star-burst-container">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="star-ray"
          style={{
            transform: `rotate(${i * 45}deg)`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{
            duration: 0.6,
            delay: i * 0.05,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function GoalCelebration() {
  const showCelebration = useTodayGoalJustCompleted();
  const clearGoalCelebration = useWritingStreakStore((state) => state.clearGoalCelebration);
  const getTodayProgress = useWritingStreakStore((state) => state.getTodayProgress);
  const settings = useWritingStreakStore((state) => state.settings);
  const prefersReducedMotion = useReducedMotion();

  const progress = getTodayProgress();

  // Auto-dismiss after animation completes
  useEffect(() => {
    if (showCelebration) {
      const timer = setTimeout(() => {
        clearGoalCelebration();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [showCelebration, clearGoalCelebration]);

  const handleDismiss = useCallback(() => {
    clearGoalCelebration();
  }, [clearGoalCelebration]);

  // Don't show if celebrations are disabled
  if (!settings.celebrateMilestones) {
    return null;
  }

  return (
    <AnimatePresence>
      {showCelebration && (
        <motion.div
          className="goal-celebration-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleDismiss}
          role="dialog"
          aria-label="Goal completed celebration"
        >
          <motion.div
            className="goal-celebration-modal"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: -10 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti particles */}
            <div className="confetti-container">
              {[...Array(30)].map((_, i) => (
                <ConfettiParticle key={i} index={i} prefersReducedMotion={prefersReducedMotion} />
              ))}
            </div>

            {/* Star burst effect */}
            <StarBurst prefersReducedMotion={prefersReducedMotion} />

            {/* Trophy/check icon */}
            <motion.div
              className="celebration-icon"
              initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </motion.div>

            {/* Celebration text */}
            <motion.h2
              className="celebration-title"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
            >
              Goal Achieved!
            </motion.h2>

            <motion.p
              className="celebration-message"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
            >
              You wrote <strong>{progress.wordCount.toLocaleString()}</strong> words today!
            </motion.p>

            <motion.p
              className="celebration-encouragement"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5 }}
            >
              Keep up the great work!
            </motion.p>

            <motion.button
              className="celebration-dismiss"
              onClick={handleDismiss}
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.6 }}
            >
              Continue Writing
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
