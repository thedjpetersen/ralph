import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Modal } from './ui/Modal';
import { useWritingStreakStore, type DayEntry } from '../stores/writingStreak';
import './StreakCalendar.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarDay {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  entry: DayEntry | null;
}

function getCalendarDays(year: number, month: number, writingHistory: Record<string, DayEntry>): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  const days: CalendarDay[] = [];

  // Add days from previous month to fill the first week
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    const dateString = date.toISOString().split('T')[0];
    days.push({
      date,
      dateString,
      isCurrentMonth: false,
      isToday: dateString === todayString,
      entry: writingHistory[dateString] || null,
    });
  }

  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    days.push({
      date,
      dateString,
      isCurrentMonth: true,
      isToday: dateString === todayString,
      entry: writingHistory[dateString] || null,
    });
  }

  // Add days from next month to complete the grid (6 rows = 42 days)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    const dateString = date.toISOString().split('T')[0];
    days.push({
      date,
      dateString,
      isCurrentMonth: false,
      isToday: dateString === todayString,
      entry: writingHistory[dateString] || null,
    });
  }

  return days;
}

// Fire icon for milestone badges
function MilestoneIcon({ milestone }: { milestone: 7 | 30 | 100 }) {
  const colors: Record<number, string> = {
    7: '#f59e0b',
    30: '#8b5cf6',
    100: '#ef4444',
  };

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={colors[milestone]} aria-hidden="true">
      <path d="M12 2C8.5 6 4 9 4 14a8 8 0 0 0 16 0c0-5-4.5-8-8-12z" />
    </svg>
  );
}

export function StreakCalendar() {
  const isOpen = useWritingStreakStore((state) => state.isCalendarOpen);
  const closeCalendar = useWritingStreakStore((state) => state.closeCalendar);
  const writingHistory = useWritingStreakStore((state) => state.writingHistory);
  const currentStreak = useWritingStreakStore((state) => state.currentStreak);
  const longestStreak = useWritingStreakStore((state) => state.longestStreak);
  const totalDaysWritten = useWritingStreakStore((state) => state.totalDaysWritten);
  const milestonesReached = useWritingStreakStore((state) => state.milestonesReached);
  const settings = useWritingStreakStore((state) => state.settings);

  const [viewDate, setViewDate] = useState(() => new Date());

  const calendarDays = useMemo(
    () => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth(), writingHistory),
    [viewDate, writingHistory]
  );

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  const getDayIntensity = (entry: DayEntry | null): 'none' | 'low' | 'medium' | 'high' | 'complete' => {
    if (!entry) return 'none';
    if (entry.goalMet) return 'complete';

    const percentage = (entry.wordCount / settings.dailyGoal) * 100;
    if (percentage >= 75) return 'high';
    if (percentage >= 50) return 'medium';
    if (percentage >= 25) return 'low';
    return 'none';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeCalendar}
      title="Writing Streak History"
      size="md"
    >
      <div className="streak-calendar">
        {/* Stats summary */}
        <div className="streak-stats">
          <div className="streak-stat">
            <span className="streak-stat-value">{currentStreak}</span>
            <span className="streak-stat-label">Current Streak</span>
          </div>
          <div className="streak-stat">
            <span className="streak-stat-value">{longestStreak}</span>
            <span className="streak-stat-label">Longest Streak</span>
          </div>
          <div className="streak-stat">
            <span className="streak-stat-value">{totalDaysWritten}</span>
            <span className="streak-stat-label">Total Days</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="streak-milestones">
          <span className="milestones-label">Milestones:</span>
          <div className="milestone-badges">
            <div className={`milestone-badge ${milestonesReached.day7 ? 'earned' : ''}`} title="7-day streak">
              <MilestoneIcon milestone={7} />
              <span>7</span>
            </div>
            <div className={`milestone-badge ${milestonesReached.day30 ? 'earned' : ''}`} title="30-day streak">
              <MilestoneIcon milestone={30} />
              <span>30</span>
            </div>
            <div className={`milestone-badge ${milestonesReached.day100 ? 'earned' : ''}`} title="100-day streak">
              <MilestoneIcon milestone={100} />
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Calendar navigation */}
        <div className="calendar-nav">
          <button
            className="calendar-nav-btn"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="calendar-title" onClick={goToToday} title="Go to today">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </button>
          <button
            className="calendar-nav-btn"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid" role="grid" aria-label="Writing history calendar">
          {/* Day headers */}
          <div className="calendar-header" role="row">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="calendar-header-cell" role="columnheader">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="calendar-body" role="rowgroup">
            {calendarDays.map((day, index) => {
              const intensity = getDayIntensity(day.entry);

              return (
                <motion.div
                  key={day.dateString}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} intensity-${intensity}`}
                  role="gridcell"
                  aria-label={`${day.date.toLocaleDateString()}: ${day.entry ? `${day.entry.wordCount} words${day.entry.goalMet ? ', goal met' : ''}` : 'No writing'}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.01 }}
                  title={day.entry ? `${day.entry.wordCount} words` : undefined}
                >
                  <span className="calendar-day-number">{day.date.getDate()}</span>
                  {day.entry && day.entry.goalMet && (
                    <span className="calendar-day-indicator" aria-hidden="true" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <span className="legend-label">Less</span>
          <div className="legend-items">
            <div className="legend-item intensity-none" title="No writing" />
            <div className="legend-item intensity-low" title="25% of goal" />
            <div className="legend-item intensity-medium" title="50% of goal" />
            <div className="legend-item intensity-high" title="75% of goal" />
            <div className="legend-item intensity-complete" title="Goal met" />
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
    </Modal>
  );
}
