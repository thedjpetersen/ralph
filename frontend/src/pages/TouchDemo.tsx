import { useState, useRef } from 'react';
import { PageTransition } from '../components/PageTransition';
import {
  Modal,
  Button,
  SwipeableListItem,
  ContextMenu,
  type ContextMenuItem,
} from '../components/ui';
import { useTapOutsideDeselect } from '../hooks/useTapOutsideDeselect';
import './TouchDemo.css';

interface DemoItem {
  id: string;
  title: string;
  description: string;
}

const DEMO_ITEMS: DemoItem[] = [
  { id: '1', title: 'Document 1', description: 'Swipe right for quick actions' },
  { id: '2', title: 'Document 2', description: 'Long press for context menu' },
  { id: '3', title: 'Document 3', description: 'Tap to select' },
  { id: '4', title: 'Document 4', description: 'Mobile-optimized touch targets' },
];

export function TouchDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    itemId: string | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, itemId: null });

  // Reference to the list container for tap-outside-to-deselect
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Use the tap outside hook to deselect when tapping outside the list
  useTapOutsideDeselect(listContainerRef, {
    isActive: selectedItem !== null,
    onDeselect: () => setSelectedItem(null),
    ignoreClassNames: ['context-menu', 'context-menu-backdrop'],
  });

  const handleLongPress = (
    itemId: string,
    position: { x: number; y: number }
  ) => {
    setContextMenu({
      isOpen: true,
      position,
      itemId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false, itemId: null }));
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'edit',
      label: 'Edit',
      shortcutKeys: { mac: ['⌘', 'E'], windows: ['Ctrl', 'E'] },
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      onClick: () => {
        console.log('Edit item:', contextMenu.itemId);
      },
    },
    {
      id: 'share',
      label: 'Share',
      shortcutKeys: { mac: ['⌘', '⇧', 'S'], windows: ['Ctrl', 'Shift', 'S'] },
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      onClick: () => {
        console.log('Share item:', contextMenu.itemId);
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      danger: true,
      shortcutKeys: { mac: ['⌘', '⌫'], windows: ['Del'] },
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      onClick: () => {
        console.log('Delete item:', contextMenu.itemId);
      },
    },
  ];

  const deleteIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );

  const archiveIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );

  return (
    <PageTransition>
      <div className="touch-demo-page">
        <h1>Touch-Friendly Interactions Demo</h1>
        <p className="touch-demo-subtitle">
          Test swipe gestures, long press, and modal dismiss on mobile devices
        </p>

        <section className="demo-section">
          <h2>Touch Target Sizing (44x44px minimum)</h2>
          <p className="demo-description">
            All buttons and interactive elements meet the WCAG 2.1 AAA
            recommendation of 44x44px minimum touch targets.
          </p>
          <div className="button-grid">
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="md">
              Medium
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </div>
        </section>

        <section className="demo-section">
          <h2>Swipeable List Items</h2>
          <p className="demo-description">
            Swipe right on items for quick actions. Long press for context menu.
          </p>
          <div className="demo-list" role="list" ref={listContainerRef}>
            {DEMO_ITEMS.map(item => (
              <SwipeableListItem
                key={item.id}
                leftActions={[
                  {
                    id: 'archive',
                    icon: archiveIcon,
                    label: 'Archive',
                    color: 'var(--color-accent)',
                    onAction: () => console.log('Archive:', item.id),
                  },
                ]}
                rightActions={[
                  {
                    id: 'delete',
                    icon: deleteIcon,
                    label: 'Delete',
                    color: 'var(--color-error)',
                    onAction: () => console.log('Delete:', item.id),
                  },
                ]}
                onLongPress={pos => handleLongPress(item.id, pos)}
                onClick={() => setSelectedItem(item.id)}
              >
                <div
                  className={`demo-item ${selectedItem === item.id ? 'selected' : ''}`}
                >
                  <div className="demo-item-content">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <div className="demo-item-indicator">
                    {selectedItem === item.id && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="20"
                        height="20"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </div>
                </div>
              </SwipeableListItem>
            ))}
          </div>
          {selectedItem && (
            <p className="selection-hint">
              Tap outside the list to deselect. Selected: {selectedItem}
            </p>
          )}
        </section>

        <section className="demo-section">
          <h2>Swipe-to-Dismiss Modal</h2>
          <p className="demo-description">
            Open the modal and swipe down to dismiss it (on touch devices).
          </p>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
        </section>

        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Touch-Friendly Modal"
          description="Swipe down to dismiss this modal on mobile devices"
          swipeToDismiss={true}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <div className="modal-demo-content">
            <p>
              This modal includes a drag handle indicator and responds to swipe
              down gestures on touch devices.
            </p>
            <ul>
              <li>Swipe down from anywhere on the modal to dismiss</li>
              <li>The overlay opacity fades as you swipe</li>
              <li>Release to either dismiss or snap back</li>
              <li>Tap outside also closes the modal</li>
            </ul>
          </div>
        </Modal>

        <ContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          items={contextMenuItems}
          onClose={closeContextMenu}
          header="Actions"
        />
      </div>
    </PageTransition>
  );
}
