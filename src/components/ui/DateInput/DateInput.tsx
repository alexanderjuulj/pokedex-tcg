import type React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import Input from "../Input/Input";
import styles from "./DateInput.module.scss";

type DateInputProps = {
  // ISO "YYYY-MM-DD", or "" when empty — same contract as <input type="date">.
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

function toDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return iso ? `${d}/${m}/${y}` : "";
}

// "DD/MM/YYYY" (also "." or "-" separated, two-digit years) → ISO, or ""
// when incomplete/invalid.
function toIso(text: string): string {
  const parts = text.split("/");
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return "";
  const [d, m] = parts.map(Number);
  let y = Number(parts[2]);
  if (parts[2].length === 2) y += 2000;
  else if (parts[2].length !== 4) return "";
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return "";
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Plain digits get slashes inserted as you type ("01052026" → 01/05/2026);
// typed separators are kept so "1.5.2026" works too.
function formatTyped(raw: string): string {
  if (/[/.-]/.test(raw)) return raw.replace(/[.-]/g, "/").replace(/[^\d/]/g, "");
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join("/");
}

// Always DD/MM/YYYY, independent of the browser's locale (native date inputs
// follow the browser language). The calendar button opens the native picker.
const DateInput: React.FC<DateInputProps> = ({ value, onChange, required }) => {
  const [text, setText] = useState(toDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Follow outside changes (picker, form reset) without clobbering typing.
  useEffect(() => {
    if (toIso(text) !== value) setText(toDisplay(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const invalid = text !== "" && toIso(text) === "";
  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? "Use DD/MM/YYYY." : "");
  }, [invalid]);

  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = formatTyped(event.target.value);
    setText(next);
    onChange(toIso(next));
  };

  return (
    <span className={styles.wrapper}>
      <Input
        ref={inputRef}
        value={text}
        onChange={onTextChange}
        onBlur={() => value && setText(toDisplay(value))}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        autoComplete="off"
        required={required}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className={styles.picker}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className={styles.button}
        aria-label="Open calendar"
        onClick={() => pickerRef.current?.showPicker()}
      >
        <CalendarDays size={20} strokeWidth={1.75} />
      </button>
    </span>
  );
};

export default DateInput;
