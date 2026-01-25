import { type TimeToFIREResult } from '../api/client';
import './FIREProgress.css';

interface FIREProgressProps {
  currentPortfolio: number;
  fireNumber: number;
  percentageComplete: number;
  remainingNeeded: number;
  timeToFire?: TimeToFIREResult | null;
}

export function FIREProgress({
  currentPortfolio,
  fireNumber,
  percentageComplete,
  remainingNeeded,
  timeToFire,
}: FIREProgressProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const clampedPercentage = Math.min(percentageComplete, 100);
  const progressAngle = (clampedPercentage / 100) * 360;

  // Milestone markers
  const milestones = [25, 50, 75, 100];
  const currentMilestone = milestones.find(m => percentageComplete < m) ?? 100;
  const previousMilestone = milestones[milestones.indexOf(currentMilestone) - 1] ?? 0;
  const milestoneProgress = currentMilestone > 0
    ? ((percentageComplete - previousMilestone) / (currentMilestone - previousMilestone)) * 100
    : 0;

  return (
    <div className="fire-progress">
      {/* Circular Progress */}
      <div className="progress-circle-container">
        <div className="progress-circle">
          <svg viewBox="0 0 100 100" className="progress-svg">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(progressAngle / 360) * 283} 283`}
              transform="rotate(-90 50 50)"
              className="progress-arc"
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#646cff" />
                <stop offset="100%" stopColor="#2ecc71" />
              </linearGradient>
            </defs>
          </svg>
          <div className="progress-center">
            <span className="progress-percentage">{percentageComplete.toFixed(1)}%</span>
            <span className="progress-label">Complete</span>
          </div>
        </div>
      </div>

      {/* Progress Details */}
      <div className="progress-details">
        <div className="progress-bar-section">
          <div className="progress-bar-header">
            <span className="progress-bar-label">Progress to FIRE</span>
            <span className="progress-bar-value">{formatCurrency(currentPortfolio)} / {formatCurrency(fireNumber)}</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${clampedPercentage}%` }}
            />
            {/* Milestone markers */}
            {milestones.slice(0, -1).map((milestone) => (
              <div
                key={milestone}
                className={`milestone-marker ${percentageComplete >= milestone ? 'reached' : ''}`}
                style={{ left: `${milestone}%` }}
              >
                <span className="milestone-label">{milestone}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-label">Current Portfolio</span>
            <span className="stat-value current">{formatCurrency(currentPortfolio)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">FIRE Number</span>
            <span className="stat-value target">{formatCurrency(fireNumber)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Remaining</span>
            <span className="stat-value remaining">{formatCurrency(remainingNeeded)}</span>
          </div>
          {timeToFire && (
            <div className="stat-item">
              <span className="stat-label">Target Date</span>
              <span className="stat-value date">
                {new Date(timeToFire.fire_date).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Milestone Progress */}
        <div className="milestone-section">
          <div className="milestone-header">
            <span className="milestone-title">Next Milestone: {currentMilestone}%</span>
            <span className="milestone-amount">
              {formatCompactCurrency(fireNumber * (currentMilestone / 100))}
            </span>
          </div>
          <div className="milestone-bar-container">
            <div
              className="milestone-bar-fill"
              style={{ width: `${Math.min(milestoneProgress, 100)}%` }}
            />
          </div>
          <span className="milestone-hint">
            {formatCompactCurrency(fireNumber * (currentMilestone / 100) - currentPortfolio)} to reach {currentMilestone}%
          </span>
        </div>

        {/* Time to FIRE Info */}
        {timeToFire && (
          <div className="time-to-fire-section">
            <h4>Time to Financial Independence</h4>
            <div className="time-grid">
              <div className="time-item">
                <span className="time-value">{timeToFire.years_to_fire}</span>
                <span className="time-label">Years</span>
              </div>
              <div className="time-item">
                <span className="time-value">{timeToFire.months_to_fire % 12}</span>
                <span className="time-label">Months</span>
              </div>
              <div className="time-item">
                <span className="time-value">{timeToFire.fire_age}</span>
                <span className="time-label">Age at FIRE</span>
              </div>
            </div>
            <div className="projected-info">
              <span className="projected-label">Projected portfolio at FIRE:</span>
              <span className="projected-value">{formatCurrency(timeToFire.projected_portfolio_at_fire)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
