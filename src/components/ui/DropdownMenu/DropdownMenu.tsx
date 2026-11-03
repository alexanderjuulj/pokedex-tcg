import type React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./DropdownMenu.module.scss";

export type DropdownMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

type DropdownMenuProps = {
  items: DropdownMenuItem[];
  size?: "default" | "small";
};

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  items,
  size = "default",
}) => {
  // The menu is portaled to <body> and position: fixed (anchored to the
  // trigger's rect) so the table wrapper's overflow and the scroll area's
  // overflow/fade mask can't clip it.
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const open = menuPosition !== null;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) {
      setMenuPosition(null);
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  // Flip above the trigger when the menu would run past the bottom of the
  // window, e.g. for the last rows of a long list.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const trigger = rootRef.current;
    if (!menu || !trigger || !menuPosition) return;
    const rect = trigger.getBoundingClientRect();
    const height = menu.offsetHeight;
    if (rect.bottom + 4 + height <= window.innerHeight - 8) return;
    const top = Math.max(8, rect.top - 4 - height);
    if (top !== menuPosition.top) setMenuPosition({ ...menuPosition, top });
  }, [menuPosition]);

  useEffect(() => {
    if (!open) return;
    const close = () => setMenuPosition(null);
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.dropdown}>
      <button
        type="button"
        className={` ${styles.trigger} ${size === "small" ? styles.small : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        onClick={toggle}
      >
        <EllipsisVertical size={20} strokeWidth={1.75} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={menuPosition}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cn(styles.item, item.danger && styles.danger)}
                onClick={() => {
                  setMenuPosition(null);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default DropdownMenu;
