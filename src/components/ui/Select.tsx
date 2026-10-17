"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface OptionItem {
  value: string;
  label: string;
}

interface OptionProps {
  value?: string;
  children?: ReactNode;
}

// `<option>` children may be a string, or an array of strings/numbers when the
// JSX mixes text with expressions ("{a} — {b}"), so flatten to plain text.
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 256;

// A styled replacement for the native <select>: same `<option>` children API,
// but `onChange` receives the value directly. The empty-value option is the
// placeholder; it is only listed in the menu when `allowEmpty` is set (for
// selects where "default / none" is a real choice).
export function Select({
  value,
  onChange,
  children,
  disabled = false,
  required = false,
  allowEmpty = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
  className?: string;
}) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [position, setPosition] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(
    null,
  );

  const options = useMemo(() => {
    const items: OptionItem[] = [];
    Children.forEach(children, (child) => {
      if (!isValidElement(child)) return;
      const element = child as ReactElement<OptionProps>;
      items.push({ value: String(element.props.value ?? ""), label: textOf(element.props.children) });
    });
    return items;
  }, [children]);

  const placeholder = options.find((option) => option.value === "")?.label ?? "";
  const selected = options.find((option) => option.value === value && option.value !== "");
  const listed = useMemo(
    () => options.filter((option) => allowEmpty || option.value !== ""),
    [options, allowEmpty],
  );

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 160) + MENU_GAP && rect.top > spaceBelow;
    setPosition({
      left: rect.left,
      width: rect.width,
      ...(openUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
    });
  }, []);

  function open() {
    if (disabled) return;
    updatePosition();
    const index = listed.findIndex((option) => option.value === value);
    setHighlighted(index >= 0 ? index : 0);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function choose(option: OptionItem) {
    onChange(option.value);
    close();
    buttonRef.current?.focus();
  }

  // Keep the menu glued to the button while the page or the modal scrolls.
  useEffect(() => {
    if (!isOpen) return;
    function onDocPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocPointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Scroll the highlighted option into view (also on open, for the selected one).
  useLayoutEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlighted, position]);

  // A disabled select (e.g. "choose a CRM first") must not stay open.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the menu when the select becomes disabled
    if (disabled) setIsOpen(false);
  }, [disabled]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((index) => Math.min(index + 1, listed.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;
      case "End":
        event.preventDefault();
        setHighlighted(listed.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (listed[highlighted]) choose(listed[highlighted]);
        break;
      case "Escape":
        // Stop here so an enclosing modal doesn't also close.
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  }

  const menu =
    isOpen && position
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: MENU_MAX_HEIGHT,
            }}
            className="z-[100] overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-2xl shadow-black/40"
          >
            {listed.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted">—</p>
            ) : (
              listed.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value || "__empty"}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      index === highlighted ? "bg-surface-hover" : ""
                    } ${isSelected ? "font-medium text-primary" : ""}`}
                  >
                    <span className={option.value === "" ? "text-muted" : ""}>{option.label}</span>
                    {isSelected && <Check className="size-4 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative mt-1.5 ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-activedescendant={isOpen ? `${listId}-${highlighted}` : undefined}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen ? "border-primary" : "border-border hover:border-primary/50"
        }`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {/* Lets the browser's native "please fill out this field" check work. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
        />
      )}
      {menu}
    </div>
  );
}
