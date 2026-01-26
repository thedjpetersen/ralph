import { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { PageTransition } from '../components/PageTransition';
import './SidebarDemo.css';

export function SidebarDemo() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <PageTransition>
      <div className="sidebar-demo-page">
        <h1>Sidebar Navigation Component</h1>
        <p className="sidebar-demo-subtitle">NAV-001: Collapsible sidebar with navigation sections</p>

        <div className="sidebar-demo-container">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
          <div className="sidebar-demo-content">
            <h2>Features</h2>
            <ul>
              <li>Collapsible navigation sections</li>
              <li>Account switcher at the top</li>
              <li>Navigation items: Dashboard, Receipts, Purchases, Stores, Budget, Financial, Settings</li>
              <li>User menu at the bottom with logout</li>
              <li>Stripe-inspired design system</li>
              <li>Keyboard navigation support</li>
              <li>Light/dark mode support</li>
              <li>Mobile responsive</li>
            </ul>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
