import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { useWelcomeModal, FEATURED_TEMPLATES, type QuickStartTemplate } from '../stores/welcomeModal';
import { useOnboarding } from '../stores/onboarding';
import './WelcomeModal.css';

interface TemplateCardProps {
  template: QuickStartTemplate;
  onSelect: (template: QuickStartTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  return (
    <button
      className="welcome-template-card"
      onClick={() => onSelect(template)}
      type="button"
    >
      <span className="welcome-template-icon" aria-hidden="true">
        {template.icon}
      </span>
      <span className="welcome-template-content">
        <span className="welcome-template-title">{template.title}</span>
        <span className="welcome-template-description">{template.description}</span>
      </span>
    </button>
  );
}

interface QuickStartOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function QuickStartOption({ icon, title, description, onClick, variant = 'secondary' }: QuickStartOptionProps) {
  return (
    <button
      className={`welcome-quick-option welcome-quick-option-${variant}`}
      onClick={onClick}
      type="button"
    >
      <span className="welcome-quick-option-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="welcome-quick-option-content">
        <span className="welcome-quick-option-title">{title}</span>
        <span className="welcome-quick-option-description">{description}</span>
      </span>
    </button>
  );
}

export function WelcomeModal() {
  const navigate = useNavigate();
  const { isOpen, dontShowAgain, closeModal, setDontShowAgain, dismissPermanently } = useWelcomeModal();
  const { startTour } = useOnboarding();
  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreateBlank = useCallback(() => {
    if (dontShowAgain) {
      dismissPermanently();
    } else {
      closeModal();
    }
    navigate('/editor');
  }, [dontShowAgain, dismissPermanently, closeModal, navigate]);

  const handleChooseTemplate = useCallback(() => {
    setShowTemplates(true);
  }, []);

  const handleSelectTemplate = useCallback((template: QuickStartTemplate) => {
    if (dontShowAgain) {
      dismissPermanently();
    } else {
      closeModal();
    }
    // Navigate to editor with template content encoded in state
    navigate('/editor', { state: { template } });
  }, [dontShowAgain, dismissPermanently, closeModal, navigate]);

  const handleTakeTour = useCallback(() => {
    if (dontShowAgain) {
      dismissPermanently();
    } else {
      closeModal();
    }
    startTour();
  }, [dontShowAgain, dismissPermanently, closeModal, startTour]);

  const handleBack = useCallback(() => {
    setShowTemplates(false);
  }, []);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      dismissPermanently();
    } else {
      closeModal();
    }
  }, [dontShowAgain, dismissPermanently, closeModal]);

  const handleDontShowAgainChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDontShowAgain(e.target.checked);
  }, [setDontShowAgain]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton
      closeOnOverlayClick
      closeOnEscape
    >
      <div className="welcome-modal">
        {!showTemplates ? (
          <>
            <div className="welcome-header">
              <div className="welcome-logo" aria-hidden="true">
                <svg viewBox="0 0 48 48" width="48" height="48">
                  <circle cx="24" cy="24" r="22" fill="var(--color-primary)" opacity="0.1" />
                  <path
                    d="M24 12c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 22c-5.523 0-10-4.477-10-10s4.477-10 10-10 10 4.477 10 10-4.477 10-10 10zm1-15h-2v6l5.25 3.15.75-1.23-4-2.37V19z"
                    fill="var(--color-primary)"
                  />
                </svg>
              </div>
              <h2 className="welcome-title">Welcome to ClockZen!</h2>
              <p className="welcome-subtitle">
                Your focused writing space. Choose how you&apos;d like to get started.
              </p>
            </div>

            <div className="welcome-options">
              <QuickStartOption
                icon={
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                }
                title="Create Blank Document"
                description="Start fresh with a clean slate"
                onClick={handleCreateBlank}
                variant="primary"
              />

              <QuickStartOption
                icon={
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                }
                title="Choose Template"
                description="Start with a pre-built structure"
                onClick={handleChooseTemplate}
              />

              <QuickStartOption
                icon={
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
                title="Take a Quick Tour"
                description="Learn the basics in 2 minutes"
                onClick={handleTakeTour}
              />
            </div>
          </>
        ) : (
          <>
            <div className="welcome-header">
              <button
                className="welcome-back-button"
                onClick={handleBack}
                type="button"
                aria-label="Go back"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <h2 className="welcome-title">Choose a Template</h2>
              <p className="welcome-subtitle">
                Select a template to get started quickly
              </p>
            </div>

            <div className="welcome-templates">
              {FEATURED_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          </>
        )}

        <div className="welcome-footer">
          <Checkbox
            checked={dontShowAgain}
            onChange={handleDontShowAgainChange}
            label="Don't show this again"
            size="sm"
          />
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Skip for now
          </Button>
        </div>
      </div>
    </Modal>
  );
}

WelcomeModal.displayName = 'WelcomeModal';
