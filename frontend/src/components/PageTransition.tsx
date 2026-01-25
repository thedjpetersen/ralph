import { motion, type Variants } from 'framer-motion';
import { type ReactNode, useSyncExternalStore } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: 8,
  },
};

const reducedMotionVariants: Variants = {
  initial: {
    opacity: 1,
    y: 0,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 1,
    y: 0,
  },
};

const pageTransition = {
  duration: 0.15,
  ease: 'easeOut',
};

const reducedMotionTransition = {
  duration: 0,
};

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

export function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={prefersReducedMotion ? reducedMotionVariants : pageVariants}
      transition={prefersReducedMotion ? reducedMotionTransition : pageTransition}
    >
      {children}
    </motion.div>
  );
}
