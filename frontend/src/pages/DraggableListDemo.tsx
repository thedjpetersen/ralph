import { useState, useCallback } from 'react';
import { PageTransition } from '../components/PageTransition';
import { DraggableList, type DraggableItem } from '../components/ui';
import './DraggableListDemo.css';

interface DemoItem extends DraggableItem {
  title: string;
  description: string;
  color: string;
}

const initialItems: DemoItem[] = [
  { id: '1', title: 'First Item', description: 'Drag me around!', color: '#3b82f6' },
  { id: '2', title: 'Second Item', description: 'Watch the smooth animations', color: '#10b981' },
  { id: '3', title: 'Third Item', description: 'Items animate to make space', color: '#f59e0b' },
  { id: '4', title: 'Fourth Item', description: 'Drop settles item smoothly', color: '#ef4444' },
  { id: '5', title: 'Fifth Item', description: 'Order persists on reorder', color: '#8b5cf6' },
];

export function DraggableListDemo() {
  const [items, setItems] = useState<DemoItem[]>(initialItems);

  const handleReorder = useCallback((reorderedItems: DemoItem[]) => {
    setItems(reorderedItems);
  }, []);

  const renderItem = useCallback(
    (item: DemoItem, _index: number, isDragging: boolean) => (
      <div
        className={`demo-item ${isDragging ? 'demo-item-dragging' : ''}`}
        style={{ borderLeftColor: item.color }}
      >
        <div className="demo-item-content">
          <h3 className="demo-item-title">{item.title}</h3>
          <p className="demo-item-description">{item.description}</p>
        </div>
        <div className="demo-item-badge" style={{ backgroundColor: item.color }}>
          {item.id}
        </div>
      </div>
    ),
    []
  );

  return (
    <PageTransition>
      <div className="draggable-list-demo-page">
        <div className="demo-header">
          <h1>Drag-and-Drop List Demo</h1>
          <p className="demo-subtitle">
            Reorder items by dragging the handle on hover. Features smooth animations for lifting,
            spacing, and settling.
          </p>
        </div>

        <div className="demo-features">
          <div className="feature">
            <span className="feature-icon">⬡</span>
            <span>Drag handle on hover</span>
          </div>
          <div className="feature">
            <span className="feature-icon">↕</span>
            <span>Lift with shadow</span>
          </div>
          <div className="feature">
            <span className="feature-icon">↔</span>
            <span>Space animation</span>
          </div>
          <div className="feature">
            <span className="feature-icon">✓</span>
            <span>Smooth settle</span>
          </div>
        </div>

        <div className="demo-container">
          <DraggableList
            items={items}
            onReorder={handleReorder}
            renderItem={renderItem}
            className="demo-list"
            gap={12}
          />
        </div>

        <div className="demo-order">
          <h3>Current Order:</h3>
          <code>{items.map((item) => item.id).join(' → ')}</code>
        </div>
      </div>
    </PageTransition>
  );
}
