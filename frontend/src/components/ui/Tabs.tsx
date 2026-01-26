import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
  type KeyboardEvent,
  useRef,
  useEffect,
  useId,
  forwardRef,
  useMemo,
  cloneElement,
  isValidElement,
  Children,
} from 'react';
import './Tabs.css';

// Context for managing tab state
interface TabsContextValue {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  tabsId: string;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component');
  }
  return context;
}

// Context for TabList to track tab refs
interface TabListContextValue {
  setTabRef: (index: number, ref: HTMLButtonElement | null) => void;
  getTabRefs: () => Map<number, HTMLButtonElement | null>;
  tabCount: number;
}

const TabListContext = createContext<TabListContextValue | null>(null);

function useTabListContext() {
  const context = useContext(TabListContext);
  if (!context) {
    throw new Error('Tab must be used within a TabList component');
  }
  return context;
}

// Props types
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  children: ReactNode;
  /** Controlled selected tab index */
  selectedIndex?: number;
  /** Default selected tab index for uncontrolled mode */
  defaultIndex?: number;
  /** Callback when selected tab changes */
  onChange?: (index: number) => void;
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface TabProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'disabled'> {
  children: ReactNode;
  /** Disable this tab */
  disabled?: boolean;
  /** Internal: tab index (set by parent) */
  index?: number;
}

export interface TabPanelsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Internal: panel index (set by parent) */
  index?: number;
}

// Main Tabs component
export function Tabs({
  children,
  selectedIndex: controlledIndex,
  defaultIndex = 0,
  onChange,
  orientation = 'horizontal',
  className = '',
  ...props
}: TabsProps) {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultIndex);
  const tabsId = useId();

  const isControlled = controlledIndex !== undefined;
  const selectedIndex = isControlled ? controlledIndex : uncontrolledIndex;

  const setSelectedIndex = useCallback(
    (index: number) => {
      if (!isControlled) {
        setUncontrolledIndex(index);
      }
      onChange?.(index);
    },
    [isControlled, onChange]
  );

  const classes = [
    'tabs',
    `tabs-${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <TabsContext.Provider value={{ selectedIndex, setSelectedIndex, tabsId, orientation }}>
      <div className={classes} data-orientation={orientation} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// TabList component
export function TabList({ children, className = '', ...props }: TabListProps) {
  const { selectedIndex, setSelectedIndex, orientation } = useTabsContext();
  const tabRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());

  // Count children to get tab count
  const tabCount = useMemo(() => {
    let count = 0;
    const countChildren = (nodes: ReactNode): void => {
      if (Array.isArray(nodes)) {
        nodes.forEach(countChildren);
      } else if (nodes !== null && nodes !== undefined && typeof nodes === 'object' && 'type' in nodes) {
        count += 1;
      }
    };
    countChildren(children);
    return count;
  }, [children]);

  const setTabRef = useCallback((index: number, ref: HTMLButtonElement | null) => {
    if (ref) {
      tabRefs.current.set(index, ref);
    } else {
      tabRefs.current.delete(index);
    }
  }, []);

  const getTabRefs = useCallback(() => tabRefs.current, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (tabCount === 0) return;

      const isHorizontal = orientation === 'horizontal';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

      let newIndex = selectedIndex;

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          newIndex = selectedIndex - 1;
          if (newIndex < 0) newIndex = tabCount - 1;
          break;
        case nextKey:
          e.preventDefault();
          newIndex = selectedIndex + 1;
          if (newIndex >= tabCount) newIndex = 0;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = tabCount - 1;
          break;
        default:
          return;
      }

      // Skip disabled tabs
      let attempts = 0;
      while (attempts < tabCount) {
        const tabElement = tabRefs.current.get(newIndex);
        if (tabElement && !tabElement.disabled) {
          setSelectedIndex(newIndex);
          tabElement.focus();
          break;
        }
        // Move to next/prev based on direction
        if (e.key === prevKey || e.key === 'End') {
          newIndex = newIndex - 1;
          if (newIndex < 0) newIndex = tabCount - 1;
        } else {
          newIndex = newIndex + 1;
          if (newIndex >= tabCount) newIndex = 0;
        }
        attempts++;
      }
    },
    [selectedIndex, setSelectedIndex, orientation, tabCount]
  );

  const classes = ['tab-list', className].filter(Boolean).join(' ');

  // Render children with index prop
  const indexedChildren = useMemo(() => {
    return Children.map(children, (child, idx) => {
      if (isValidElement(child)) {
        return cloneElement(child, { index: idx } as Record<string, unknown>);
      }
      return child;
    });
  }, [children]);

  return (
    <TabListContext.Provider value={{ setTabRef, getTabRefs, tabCount }}>
      <div
        role="tablist"
        aria-orientation={orientation}
        className={classes}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {indexedChildren}
      </div>
    </TabListContext.Provider>
  );
}

// Tab component
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  {
    children,
    disabled = false,
    className = '',
    onClick,
    index = 0,
    ...props
  },
  forwardedRef
) {
  const { selectedIndex, setSelectedIndex, tabsId } = useTabsContext();
  const { setTabRef } = useTabListContext();
  const internalRef = useRef<HTMLButtonElement>(null);

  // Update ref in context after mount
  useEffect(() => {
    setTabRef(index, internalRef.current);
    return () => {
      setTabRef(index, null);
    };
  }, [index, setTabRef]);

  const isSelected = selectedIndex === index;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        setSelectedIndex(index);
        onClick?.(e);
      }
    },
    [disabled, index, onClick, setSelectedIndex]
  );

  const classes = [
    'tab',
    isSelected && 'tab-selected',
    disabled && 'tab-disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tabPanelId = `${tabsId}-panel-${index}`;
  const tabId = `${tabsId}-tab-${index}`;

  // Combine refs
  const setRefs = useCallback((el: HTMLButtonElement | null) => {
    (internalRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    if (typeof forwardedRef === 'function') {
      forwardedRef(el);
    } else if (forwardedRef) {
      forwardedRef.current = el;
    }
  }, [forwardedRef]);

  return (
    <button
      ref={setRefs}
      role="tab"
      id={tabId}
      type="button"
      className={classes}
      onClick={handleClick}
      disabled={disabled}
      aria-selected={isSelected}
      aria-controls={tabPanelId}
      tabIndex={isSelected ? 0 : -1}
      {...props}
    >
      {children}
    </button>
  );
});

// TabPanels component
export function TabPanels({ children, className = '', ...props }: TabPanelsProps) {
  const classes = ['tab-panels', className].filter(Boolean).join(' ');

  // Render children with index prop
  const indexedChildren = useMemo(() => {
    return Children.map(children, (child, idx) => {
      if (isValidElement(child)) {
        return cloneElement(child, { index: idx } as Record<string, unknown>);
      }
      return child;
    });
  }, [children]);

  return (
    <div className={classes} {...props}>
      {indexedChildren}
    </div>
  );
}

// TabPanel component
export function TabPanel({ children, className = '', index = 0, ...props }: TabPanelProps) {
  const { selectedIndex, tabsId } = useTabsContext();

  const isSelected = selectedIndex === index;

  const classes = [
    'tab-panel',
    isSelected && 'tab-panel-selected',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tabPanelId = `${tabsId}-panel-${index}`;
  const tabId = `${tabsId}-tab-${index}`;

  return (
    <div
      role="tabpanel"
      id={tabPanelId}
      className={classes}
      aria-labelledby={tabId}
      hidden={!isSelected}
      tabIndex={0}
      {...props}
    >
      {isSelected ? children : null}
    </div>
  );
}

// Compound component pattern
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panels = TabPanels;
Tabs.Panel = TabPanel;

// Display names for debugging
Tabs.displayName = 'Tabs';
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanels.displayName = 'TabPanels';
TabPanel.displayName = 'TabPanel';
