import { useAnnouncerStore } from '../stores/announcer';
import './ScreenReaderAnnouncer.css';

/**
 * ScreenReaderAnnouncer - Global component for screen reader announcements
 *
 * This component renders hidden live regions that announce dynamic content
 * changes to screen reader users. It supports both 'polite' and 'assertive'
 * announcements.
 *
 * Usage:
 * ```tsx
 * // In your app's root component
 * <ScreenReaderAnnouncer />
 *
 * // To make an announcement from anywhere in the app
 * import { announce } from '../stores/announcer';
 * announce('Your changes have been saved'); // polite (default)
 * announce.assertive('Error: Please fill in all required fields'); // assertive
 * ```
 */
export function ScreenReaderAnnouncer() {
  const announcements = useAnnouncerStore((state) => state.announcements);

  const politeAnnouncements = announcements.filter((a) => a.politeness === 'polite');
  const assertiveAnnouncements = announcements.filter((a) => a.politeness === 'assertive');

  return (
    <>
      {/* Polite announcements - will wait for current speech to finish */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeAnnouncements.map((announcement) => (
          <span key={announcement.id}>{announcement.message}</span>
        ))}
      </div>

      {/* Assertive announcements - will interrupt current speech */}
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveAnnouncements.map((announcement) => (
          <span key={announcement.id}>{announcement.message}</span>
        ))}
      </div>
    </>
  );
}
