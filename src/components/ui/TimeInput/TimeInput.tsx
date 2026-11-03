import type React from "react";
import { useEffect, useRef, useState } from "react";
import Input from "../Input/Input";

type TimeInputProps = {
  // 24-hour "HH:MM", or "" when empty — same contract as <input type="time">.
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

// "HH:MM" (also "H:MM" or "HH.MM") → normalized "HH:MM", or "" when
// incomplete/invalid.
function toValue(text: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return "";
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h < 24 && m < 60 ? `${pad(h)}:${pad(m)}` : "";
}

// Plain digits get a colon inserted ("0930" → 09:30); a typed separator is
// kept so "9:30" works too.
function formatTyped(raw: string): string {
  if (/[:.]/.test(raw)) return raw.replace(".", ":").replace(/[^\d:]/g, "").slice(0, 5);
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

// Always 24-hour, independent of the browser's locale (native time inputs
// follow the browser language and may show AM/PM).
const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, required }) => {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow outside changes without clobbering typing.
  useEffect(() => {
    if (toValue(text) !== value) setText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const invalid = text !== "" && toValue(text) === "";
  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? "Use 24-hour HH:MM." : "");
  }, [invalid]);

  const onTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = formatTyped(event.target.value);
    setText(next);
    onChange(toValue(next));
  };

  return (
    <Input
      ref={inputRef}
      value={text}
      onChange={onTextChange}
      onBlur={() => value && setText(value)}
      placeholder="HH:MM"
      inputMode="numeric"
      autoComplete="off"
      required={required}
    />
  );
};

export default TimeInput;
