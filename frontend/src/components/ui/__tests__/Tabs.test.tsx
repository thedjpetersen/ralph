import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../Tabs';

describe('Tabs', () => {
  describe('Basic Rendering', () => {
    it('renders a tabs container', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders all tabs', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('renders first panel by default', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1 Content</TabPanel>
            <TabPanel>Panel 2 Content</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel 1 Content');
    });

    it('applies custom className to Tabs', () => {
      render(
        <Tabs className="custom-tabs">
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(document.querySelector('.custom-tabs')).toBeInTheDocument();
    });
  });

  describe('Uncontrolled Mode', () => {
    it('selects first tab by default', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('uses defaultIndex prop', () => {
      render(
        <Tabs defaultIndex={1}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('switches tabs when clicked', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1 Content</TabPanel>
            <TabPanel>Panel 2 Content</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      fireEvent.click(tab2);

      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel 2 Content');
    });

    it('calls onChange when tab changes', () => {
      const handleChange = vi.fn();
      render(
        <Tabs onChange={handleChange}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(handleChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Controlled Mode', () => {
    it('uses selectedIndex prop', () => {
      render(
        <Tabs selectedIndex={1}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('updates when selectedIndex changes', () => {
      function ControlledTabs() {
        const [index, setIndex] = useState(0);
        return (
          <>
            <button onClick={() => setIndex(1)}>Switch to Tab 2</button>
            <Tabs selectedIndex={index} onChange={setIndex}>
              <TabList>
                <Tab>Tab 1</Tab>
                <Tab>Tab 2</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>Panel 1</TabPanel>
                <TabPanel>Panel 2</TabPanel>
              </TabPanels>
            </Tabs>
          </>
        );
      }

      render(<ControlledTabs />);

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');

      fireEvent.click(screen.getByText('Switch to Tab 2'));

      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onChange in controlled mode', () => {
      const handleChange = vi.fn();
      render(
        <Tabs selectedIndex={0} onChange={handleChange}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );

      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));
      expect(handleChange).toHaveBeenCalledWith(1);
    });
  });

  describe('TabList', () => {
    it('has tablist role', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Tabs>
          <TabList className="custom-tab-list">
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(document.querySelector('.custom-tab-list')).toBeInTheDocument();
    });

    it('has horizontal orientation by default', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
    });
  });

  describe('Tab', () => {
    it('has tab role', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tab')).toBeInTheDocument();
    });

    it('has correct aria-selected attribute', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('applies selected class when selected', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveClass('tab-selected');
    });

    it('applies custom className', () => {
      render(
        <Tabs>
          <TabList>
            <Tab className="custom-tab">Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tab')).toHaveClass('custom-tab');
    });
  });

  describe('Disabled Tab', () => {
    it('applies disabled attribute', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab disabled>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeDisabled();
    });

    it('applies disabled class', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab disabled>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveClass('tab-disabled');
    });

    it('does not switch to disabled tab on click', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab disabled>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1 Content</TabPanel>
            <TabPanel>Panel 2 Content</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const disabledTab = screen.getByRole('tab', { name: 'Tab 2' });
      fireEvent.click(disabledTab);

      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel 1 Content');
    });
  });

  describe('TabPanels', () => {
    it('applies custom className', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels className="custom-tab-panels">
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(document.querySelector('.custom-tab-panels')).toBeInTheDocument();
    });
  });

  describe('TabPanel', () => {
    it('has tabpanel role', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('has hidden attribute when not selected', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );
      // Only one tabpanel should be visible
      const visiblePanel = screen.getByRole('tabpanel');
      expect(visiblePanel).not.toHaveAttribute('hidden');
      expect(visiblePanel).toHaveTextContent('Panel 1');
    });

    it('is focusable', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('tabindex', '0');
    });

    it('applies custom className', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="custom-panel">Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tabpanel')).toHaveClass('custom-panel');
    });
  });

  describe('Keyboard Navigation', () => {
    it('moves focus with ArrowRight in horizontal mode', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[0].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });

      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('moves focus with ArrowLeft in horizontal mode', () => {
      render(
        <Tabs defaultIndex={1}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[1].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowLeft' });

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('wraps around from last to first with ArrowRight', () => {
      render(
        <Tabs defaultIndex={2}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[2].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowRight' });

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('wraps around from first to last with ArrowLeft', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[0].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowLeft' });

      expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    });

    it('moves to first tab with Home key', () => {
      render(
        <Tabs defaultIndex={2}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[2].focus();
      fireEvent.keyDown(tabList, { key: 'Home' });

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('moves to last tab with End key', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[0].focus();
      fireEvent.keyDown(tabList, { key: 'End' });

      expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Vertical Orientation', () => {
    it('applies vertical class when orientation is vertical', () => {
      render(
        <Tabs orientation="vertical">
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(document.querySelector('.tabs-vertical')).toBeInTheDocument();
    });

    it('sets vertical aria-orientation', () => {
      render(
        <Tabs orientation="vertical">
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('uses ArrowDown for next in vertical mode', () => {
      render(
        <Tabs orientation="vertical">
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[0].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowDown' });

      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('uses ArrowUp for previous in vertical mode', () => {
      render(
        <Tabs orientation="vertical" defaultIndex={1}>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
            <Tab>Tab 3</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
            <TabPanel>Panel 3</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');

      tabs[1].focus();
      fireEvent.keyDown(tabList, { key: 'ArrowUp' });

      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Compound Component Pattern', () => {
    it('supports Tabs.List syntax', () => {
      render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab>Tab 1</Tabs.Tab>
            <Tabs.Tab>Tab 2</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panels>
            <Tabs.Panel>Panel 1</Tabs.Panel>
            <Tabs.Panel>Panel 2</Tabs.Panel>
          </Tabs.Panels>
        </Tabs>
      );
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA structure', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabList = screen.getByRole('tablist');
      const tabs = screen.getAllByRole('tab');
      const panel = screen.getByRole('tabpanel');

      expect(tabList).toBeInTheDocument();
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[0]).toHaveAttribute('aria-controls');
      expect(panel).toHaveAttribute('aria-labelledby');
    });

    it('tab has aria-controls matching panel id', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tab = screen.getByRole('tab');
      const panel = screen.getByRole('tabpanel');

      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    });

    it('panel has aria-labelledby matching tab id', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tab = screen.getByRole('tab');
      const panel = screen.getByRole('tabpanel');

      expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    });

    it('selected tab has tabindex 0, others have -1', () => {
      render(
        <Tabs>
          <TabList>
            <Tab>Tab 1</Tab>
            <Tab>Tab 2</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Panel 1</TabPanel>
            <TabPanel>Panel 2</TabPanel>
          </TabPanels>
        </Tabs>
      );

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveAttribute('tabindex', '0');
      expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    });
  });
});
