import { PageTransition } from '../components/PageTransition';
import { toast } from '../stores/toast';
import './ToastDemo.css';

export function ToastDemo() {
  const showSuccessToast = () => {
    toast.success('Changes saved successfully!');
  };

  const showErrorToast = () => {
    toast.error('Failed to save changes. Please try again.');
  };

  const showInfoToast = () => {
    toast.info('Your session will expire in 5 minutes.');
  };

  const showToastWithAction = () => {
    toast.error('Item deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          toast.success('Item restored!');
        },
      },
    });
  };

  const showLongDurationToast = () => {
    toast.info('This toast will stay for 10 seconds.', {
      duration: 10000,
    });
  };

  const showPersistentToast = () => {
    toast.info('This toast will not auto-dismiss. Click X to close.', {
      duration: 0,
    });
  };

  const showMultipleToasts = () => {
    toast.success('First toast');
    setTimeout(() => toast.info('Second toast'), 200);
    setTimeout(() => toast.error('Third toast'), 400);
    setTimeout(() => toast.success('Fourth toast (queued)'), 600);
  };

  return (
    <PageTransition>
      <div className="toast-demo-page">
        <div className="toast-demo-header">
          <h1>Toast Notifications</h1>
          <p className="toast-demo-subtitle">UI-003: Unified toast system for success, error, and info messages</p>
        </div>

        <section className="toast-demo-section">
          <h2>Basic Toasts</h2>
          <p className="section-description">Auto-dismiss after 4 seconds, slide-up animation</p>
          <div className="toast-demo-buttons">
            <button className="demo-button demo-button-success" onClick={showSuccessToast}>
              Show Success
            </button>
            <button className="demo-button demo-button-error" onClick={showErrorToast}>
              Show Error
            </button>
            <button className="demo-button demo-button-info" onClick={showInfoToast}>
              Show Info
            </button>
          </div>
        </section>

        <section className="toast-demo-section">
          <h2>Action Button</h2>
          <p className="section-description">Toast with an action button (e.g., Undo)</p>
          <div className="toast-demo-buttons">
            <button className="demo-button" onClick={showToastWithAction}>
              Show with Action
            </button>
          </div>
        </section>

        <section className="toast-demo-section">
          <h2>Duration Options</h2>
          <p className="section-description">Configurable auto-dismiss duration</p>
          <div className="toast-demo-buttons">
            <button className="demo-button" onClick={showLongDurationToast}>
              10 Second Toast
            </button>
            <button className="demo-button" onClick={showPersistentToast}>
              Persistent (No Auto-dismiss)
            </button>
          </div>
        </section>

        <section className="toast-demo-section">
          <h2>Stacking &amp; Queue</h2>
          <p className="section-description">Maximum 3 toasts visible, older ones queue</p>
          <div className="toast-demo-buttons">
            <button className="demo-button" onClick={showMultipleToasts}>
              Show 4 Toasts
            </button>
            <button className="demo-button demo-button-secondary" onClick={() => toast.dismissAll()}>
              Clear All
            </button>
          </div>
        </section>

        <section className="toast-demo-section">
          <h2>Features</h2>
          <ul className="feature-list">
            <li>Slide-up animation on appear</li>
            <li>Auto-dismiss after 4 seconds (configurable)</li>
            <li>Manual dismiss with X button or swipe</li>
            <li>Action button support (e.g., Undo)</li>
            <li>Maximum 3 toasts visible, older ones queue</li>
            <li>Success: green accent, Error: red accent, Info: blue accent</li>
            <li>Respects prefers-reduced-motion</li>
            <li>Accessible with ARIA attributes</li>
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
