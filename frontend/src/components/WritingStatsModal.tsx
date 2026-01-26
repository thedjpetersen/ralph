import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { useWritingStreakStore, useIsStatsModalOpen } from '../stores/writingStreak';
import './WritingStatsModal.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function StatCard({ label, value, unit, highlight = false }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className={`stat-card ${highlight ? 'stat-card-highlight' : ''}`}>
      <span className="stat-card-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="stat-card-unit">{unit}</span>}
      </span>
      <span className="stat-card-label">{label}</span>
    </div>
  );
}

function ProgressRing({ percentage, label }: { percentage: number; label: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-ring-container">
      <svg viewBox="0 0 100 100" className="progress-ring">
        <circle
          className="progress-ring-bg"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
        />
        <motion.circle
          className="progress-ring-fill"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="progress-ring-content">
        <span className="progress-ring-value">{percentage}%</span>
        <span className="progress-ring-label">{label}</span>
      </div>
    </div>
  );
}

type StatsTab = 'weekly' | 'monthly';

export function WritingStatsModal() {
  const isOpen = useIsStatsModalOpen();
  const closeStatsModal = useWritingStreakStore((state) => state.closeStatsModal);
  const getWeeklyStats = useWritingStreakStore((state) => state.getWeeklyStats);
  const getMonthlyStats = useWritingStreakStore((state) => state.getMonthlyStats);
  const getTodayProgress = useWritingStreakStore((state) => state.getTodayProgress);
  const currentStreak = useWritingStreakStore((state) => state.currentStreak);
  const longestStreak = useWritingStreakStore((state) => state.longestStreak);
  const settings = useWritingStreakStore((state) => state.settings);

  const [activeTab, setActiveTab] = useState<StatsTab>('weekly');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const todayProgress = useMemo(() => getTodayProgress(), [getTodayProgress]);
  const weeklyStats = useMemo(() => getWeeklyStats(), [getWeeklyStats]);
  const monthlyStats = useMemo(
    () => getMonthlyStats(selectedMonth, selectedYear),
    [getMonthlyStats, selectedMonth, selectedYear]
  );

  const weeklyGoalPercentage = Math.round((weeklyStats.goalsMetCount / 7) * 100);
  const monthlyGoalPercentage = Math.round(
    (monthlyStats.goalsMetCount / monthlyStats.totalDaysInMonth) * 100
  );

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    if (isCurrentMonth) return;

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = MONTHS[startDate.getMonth()].slice(0, 3);
    const endMonth = MONTHS[endDate.getMonth()].slice(0, 3);

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`;
    }
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeStatsModal}
      title="Writing Statistics"
      size="md"
    >
      <div className="writing-stats-modal">
        {/* Today's Progress Summary */}
        <div className="stats-today-summary">
          <div className="today-progress-visual">
            <div className="today-progress-bar">
              <motion.div
                className="today-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${todayProgress.percentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="today-progress-info">
              <span className="today-progress-count">
                {todayProgress.wordCount.toLocaleString()} / {todayProgress.goal.toLocaleString()}
              </span>
              <span className="today-progress-label">words today</span>
            </div>
          </div>
          {todayProgress.goalMet ? (
            <span className="today-badge today-badge-complete">Goal Met!</span>
          ) : (
            <span className="today-badge today-badge-remaining">
              {todayProgress.wordsRemaining.toLocaleString()} to go
            </span>
          )}
        </div>

        {/* Streak Summary */}
        <div className="streak-summary-row">
          <StatCard label="Current Streak" value={currentStreak} unit=" days" highlight />
          <StatCard label="Longest Streak" value={longestStreak} unit=" days" />
          <StatCard label="Daily Goal" value={settings.dailyGoal} unit=" words" />
        </div>

        {/* Tabs */}
        <div className="stats-tabs">
          <button
            className={`stats-tab ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            This Week
          </button>
          <button
            className={`stats-tab ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            Monthly
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'weekly' && (
          <div className="stats-content">
            <div className="stats-period-header">
              <h3>{formatDateRange(weeklyStats.startDate, weeklyStats.endDate)}</h3>
            </div>

            <div className="stats-grid">
              <div className="stats-main">
                <ProgressRing percentage={weeklyGoalPercentage} label="Goals Met" />
              </div>
              <div className="stats-details">
                <StatCard label="Total Words" value={weeklyStats.totalWords} />
                <StatCard label="Days Written" value={weeklyStats.daysWritten} unit="/7" />
                <StatCard label="Goals Met" value={weeklyStats.goalsMetCount} unit="/7" />
                <StatCard label="Avg/Day" value={weeklyStats.averageWordsPerDay} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="stats-content">
            <div className="stats-period-header">
              <button
                className="month-nav-btn"
                onClick={handlePreviousMonth}
                aria-label="Previous month"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <h3>{MONTHS[selectedMonth]} {selectedYear}</h3>
              <button
                className="month-nav-btn"
                onClick={handleNextMonth}
                disabled={
                  selectedMonth === new Date().getMonth() &&
                  selectedYear === new Date().getFullYear()
                }
                aria-label="Next month"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="stats-grid">
              <div className="stats-main">
                <ProgressRing percentage={monthlyGoalPercentage} label="Goals Met" />
              </div>
              <div className="stats-details">
                <StatCard label="Total Words" value={monthlyStats.totalWords} />
                <StatCard
                  label="Days Written"
                  value={monthlyStats.daysWritten}
                  unit={`/${monthlyStats.totalDaysInMonth}`}
                />
                <StatCard
                  label="Goals Met"
                  value={monthlyStats.goalsMetCount}
                  unit={`/${monthlyStats.totalDaysInMonth}`}
                />
                <StatCard label="Avg/Day" value={monthlyStats.averageWordsPerDay} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
