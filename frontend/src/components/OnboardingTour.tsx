import { useEffect, useRef, useState, useCallback, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useOnboarding, useOnboardingStore, TOUR_STEPS, type TourStep } from '../stores/onboarding';
import { Button } from './ui/Button';
import './OnboardingTour.css';

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

function calculateTooltipPosition(currentStep: TourStep | undefined): {
  position: TooltipPosition;
  rect: DOMRect | null;
} {
  if (!currentStep) {
    return {
      position: { top: 0, left: 0, arrowPosition: 'none' },
      rect: null,
    };
  }

  const { targetSelector, placement } = currentStep;

  // Center placement (no target)
  if (!targetSelector || placement === 'center') {
    return {
      position: {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        arrowPosition: 'none',
      },
      rect: null,
    };
  }

  const targetElement = document.querySelector(targetSelector);
  if (!targetElement) {
    // Fallback to center if target not found
    return {
      position: {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        arrowPosition: 'none',
      },
      rect: null,
    };
  }

  const rect = targetElement.getBoundingClientRect();
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const padding = 16;
  const arrowSize = 12;

  let top = 0;
  let left = 0;
  let arrowPosition: 'top' | 'bottom' | 'left' | 'right' | 'none' = 'none';

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + padding + arrowSize;
      arrowPosition = 'left';
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - padding - arrowSize;
      arrowPosition = 'right';
      break;
    case 'bottom':
      top = rect.bottom + padding + arrowSize;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrowPosition = 'top';
      break;
    case 'top':
      top = rect.top - tooltipHeight - padding - arrowSize;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrowPosition = 'bottom';
      break;
  }

  // Keep tooltip within viewport
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));

  return {
    position: { top, left, arrowPosition },
    rect,
  };
}

export function OnboardingTour() {
  const {
    isTourActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    nextStep,
    previousStep,
    skipTour,
    dismissTourPermanently,
  } = useOnboarding();

  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate initial position synchronously to avoid flash
  const initialCalc = calculateTooltipPosition(currentStep);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>(initialCalc.position);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(initialCalc.rect);

  // Update position when step changes or window resizes
  const updatePosition = useCallback(() => {
    const { position, rect } = calculateTooltipPosition(currentStep);
    setTooltipPosition(position);
    setTargetRect(rect);
  }, [currentStep]);

  // Subscribe to resize/scroll events
  useEffect(() => {
    if (!isTourActive) return;

    // Update position on next frame (after render)
    const frameId = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isTourActive, currentStepIndex, updatePosition]);

  // Focus tooltip when it opens
  useEffect(() => {
    if (isTourActive && tooltipRef.current) {
      tooltipRef.current.focus();
    }
  }, [isTourActive, currentStepIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          skipTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) {
            e.preventDefault();
            previousStep();
          }
          break;
      }
    },
    [skipTour, nextStep, previousStep, isFirstStep]
  );

  if (!isTourActive || !currentStep) return null;

  const isCentered = currentStep.placement === 'center' || !currentStep.targetSelector;

  return createPortal(
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* Spotlight highlight for target element */}
      {targetRect && !isCentered && (
        <div
          className="onboarding-spotlight"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`onboarding-tooltip ${isCentered ? 'centered' : ''}`}
        style={
          isCentered
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { top: tooltipPosition.top, left: tooltipPosition.left }
        }
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Arrow */}
        {!isCentered && tooltipPosition.arrowPosition !== 'none' && (
          <div
            className={`onboarding-arrow onboarding-arrow-${tooltipPosition.arrowPosition}`}
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <div className="onboarding-content">
          <h2 id="onboarding-title" className="onboarding-title">
            {currentStep.title}
          </h2>
          <p id="onboarding-description" className="onboarding-description">
            {currentStep.description}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="onboarding-progress">
          <span className="onboarding-progress-text">
            {currentStepIndex + 1} of {totalSteps}
          </span>
          <div className="onboarding-progress-dots" role="tablist" aria-label="Tour progress">
            {TOUR_STEPS.map((step, index) => (
              <button
                key={step.id}
                className={`onboarding-progress-dot ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
                role="tab"
                aria-selected={index === currentStepIndex}
                aria-label={`Step ${index + 1}: ${step.title}`}
                onClick={() => {
                  // Allow clicking on previous or current dots
                  if (index <= currentStepIndex) {
                    const { goToStep } = useOnboardingStore.getState();
                    goToStep(index);
                  }
                }}
                disabled={index > currentStepIndex}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          <div className="onboarding-actions-left">
            {isFirstStep ? (
              <button
                type="button"
                className="onboarding-dismiss-btn"
                onClick={dismissTourPermanently}
              >
                Don&apos;t show again
              </button>
            ) : (
              <Button variant="ghost" size="sm" onClick={previousStep}>
                Back
              </Button>
            )}
          </div>
          <div className="onboarding-actions-right">
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip
            </Button>
            <Button variant="primary" size="sm" onClick={nextStep}>
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

OnboardingTour.displayName = 'OnboardingTour';
