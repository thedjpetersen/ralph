import { Modal } from './Modal';
import { Button } from './Button';
import { useOnboarding } from '../../stores/onboarding';
import './KeyboardShortcutsHelp.css';

export interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  groups?: ShortcutGroup[];
}

const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette' },
      { keys: ['?'], description: 'Show this help dialog' },
      { keys: ['H'], description: 'Go to home' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Tab'], description: 'Move to next interactive element' },
      { keys: ['Shift', 'Tab'], description: 'Move to previous interactive element' },
      { keys: ['Enter'], description: 'Activate button or link' },
      { keys: ['Space'], description: 'Toggle checkbox or activate button' },
    ],
  },
  {
    title: 'Menus & Dropdowns',
    shortcuts: [
      { keys: ['↓'], description: 'Open menu / move to next item' },
      { keys: ['↑'], description: 'Move to previous item' },
      { keys: ['Enter'], description: 'Select item' },
      { keys: ['Escape'], description: 'Close menu' },
    ],
  },
  {
    title: 'Modals & Dialogs',
    shortcuts: [
      { keys: ['Escape'], description: 'Close modal or dialog' },
      { keys: ['Tab'], description: 'Navigate within modal (focus trapped)' },
    ],
  },
];

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  groups = DEFAULT_SHORTCUTS,
}: KeyboardShortcutsHelpProps) {
  const { startTour } = useOnboarding();

  const handleStartTour = () => {
    onClose();
    // Small delay to allow modal to close first
    setTimeout(() => {
      startTour();
    }, 150);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="md"
    >
      <div className="shortcuts-help">
        {groups.map((group) => (
          <div key={group.title} className="shortcuts-group">
            <h3 className="shortcuts-group-title">{group.title}</h3>
            <dl className="shortcuts-list">
              {group.shortcuts.map((shortcut, index) => (
                <div key={index} className="shortcut-item">
                  <dt className="shortcut-keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd className="shortcut-key">{key}</kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="shortcut-separator">+</span>
                        )}
                      </span>
                    ))}
                  </dt>
                  <dd className="shortcut-description">{shortcut.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        <div className="shortcuts-tour-section">
          <Button variant="secondary" size="sm" onClick={handleStartTour}>
            Take the Tour
          </Button>
          <span className="shortcuts-tour-description">
            New here? Take a guided tour of the key features.
          </span>
        </div>
      </div>
    </Modal>
  );
}
