import { useState, useCallback } from 'react';
import { Switch } from './ui/Switch';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  useWritingStreakStore,
  DEFAULT_STREAK_SETTINGS,
} from '../stores/writingStreak';

export function StreakSettings() {
  const settings = useWritingStreakStore((state) => state.settings);
  const updateSettings = useWritingStreakStore((state) => state.updateSettings);
  const updateDailyGoal = useWritingStreakStore((state) => state.updateDailyGoal);
  const resetStreak = useWritingStreakStore((state) => state.resetStreak);
  const currentStreak = useWritingStreakStore((state) => state.currentStreak);
  const longestStreak = useWritingStreakStore((state) => state.longestStreak);
  const totalDaysWritten = useWritingStreakStore((state) => state.totalDaysWritten);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = useCallback(() => {
    resetStreak();
    setShowResetConfirm(false);
  }, [resetStreak]);

  const handleResetSettings = useCallback(() => {
    updateSettings(DEFAULT_STREAK_SETTINGS);
  }, [updateSettings]);

  return (
    <div className="settings-section-content">
      <div className="section-header">
        <h2>Writing Goals</h2>
        <p>Track your writing streak and set daily goals</p>
      </div>

      <div className="settings-group">
        <h3>Streak Tracking</h3>
        <div className="setting-item">
          <Switch
            label="Enable streak tracking"
            description="Track consecutive days of writing and display your streak"
            checked={settings.enabled}
            onChange={(e) => updateSettings({ enabled: e.target.checked })}
          />
        </div>
      </div>

      {settings.enabled && (
        <>
          <div className="settings-group">
            <h3>Daily Goal</h3>
            <div className="setting-item">
              <label className="setting-label">
                Words per day
                <span className="setting-description">Your daily writing target</span>
              </label>
              <div className="font-size-control">
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={settings.dailyGoal}
                  onChange={(e) => updateDailyGoal(Number(e.target.value))}
                  className="setting-range"
                />
                <span className="font-size-value">{settings.dailyGoal} words</span>
              </div>
            </div>
            <div className="setting-item">
              <label className="setting-label">
                Quick presets
                <span className="setting-description">Common daily goals</span>
              </label>
              <div className="goal-presets">
                {[250, 500, 750, 1000, 1500, 2000].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    className={`goal-preset-btn ${settings.dailyGoal === goal ? 'active' : ''}`}
                    onClick={() => updateDailyGoal(goal)}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h3>Notifications</h3>
            <div className="setting-item">
              <Switch
                label="Show notifications"
                description="Get notified about your writing progress"
                checked={settings.showNotifications}
                onChange={(e) => updateSettings({ showNotifications: e.target.checked })}
              />
            </div>
            <div className="setting-item">
              <Switch
                label="Celebrate milestones"
                description="Show celebration when you reach 7, 30, or 100 day streaks"
                checked={settings.celebrateMilestones}
                onChange={(e) => updateSettings({ celebrateMilestones: e.target.checked })}
              />
            </div>
          </div>

          <div className="settings-group">
            <h3>Current Stats</h3>
            <div className="streak-stats-settings">
              <div className="stat-item">
                <span className="stat-label">Current streak</span>
                <span className="stat-value">{currentStreak} days</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Longest streak</span>
                <span className="stat-value">{longestStreak} days</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total days written</span>
                <span className="stat-value">{totalDaysWritten} days</span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <h3>Reset</h3>
            <div className="reset-section">
              <p>Reset settings or clear all streak data</p>
              <div className="reset-buttons">
                <Button variant="secondary" onClick={handleResetSettings}>
                  Reset Settings
                </Button>
                <Button variant="danger" onClick={() => setShowResetConfirm(true)}>
                  Clear All Streak Data
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Clear Streak Data"
        description="Are you sure you want to clear all your writing streak data? This will reset your current streak, longest streak, and all writing history."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Clear All Data
            </Button>
          </div>
        }
      >
        <div className="reset-preview">
          <h4>The following will be cleared:</h4>
          <ul>
            <li>Current streak: {currentStreak} days</li>
            <li>Longest streak: {longestStreak} days</li>
            <li>Total writing days: {totalDaysWritten} days</li>
            <li>All writing history</li>
            <li>Milestone achievements</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
