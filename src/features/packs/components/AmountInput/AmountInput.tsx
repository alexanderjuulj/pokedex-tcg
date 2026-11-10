import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui";
import { useCurrency } from "@/hooks/useCurrency";
import { parsePrice } from "@/lib/money";

type AmountInputProps = {
  // In hundredths; null when empty.
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  "aria-label"?: string;
};

// An amount field that keeps what's typed ("6," on the way to "6,50") and
// reports it once it reads as an amount, or null when emptied.
const AmountInput: React.FC<AmountInputProps> = ({ value, onChange, placeholder, ...rest }) => {
  const money = useCurrency();
  const [text, setText] = useState(money.input(value));
  return (
    <Input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = parsePrice(e.target.value);
        if (!e.target.value.trim()) onChange(null);
        else if (parsed !== null) onChange(parsed);
      }}
      placeholder={placeholder}
      {...rest}
    />
  );
};

export default AmountInput;
