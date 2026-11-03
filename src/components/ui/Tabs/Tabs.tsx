import type React from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import styles from "./Tabs.module.scss";

export type TabsItem = {
  value: string;
  label: React.ReactNode;
  count?: number;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabsItem[];
  defaultValue?: string;
  // Controlled mode (e.g. tab synced to a ?tab= URL param).
  value?: string;
  onValueChange?: (value: string) => void;
};

const Tabs: React.FC<TabsProps> = ({
  items,
  defaultValue,
  value,
  onValueChange,
}) => {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? items[0]?.value) : undefined}
      onValueChange={
        onValueChange ? (next) => onValueChange(next as string) : undefined
      }
    >
      <BaseTabs.List className={styles.list}>
        {items.map((item) => (
          <BaseTabs.Tab
            key={item.value}
            value={item.value}
            className={styles.tab}
          >
            {item.label}
            {item.count != null && (
              <span className={styles.count}>{item.count}</span>
            )}
          </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
      {items.map((item) => (
        <BaseTabs.Panel
          key={item.value}
          value={item.value}
          className={styles.panel}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
};

export default Tabs;
