import type React from "react";
import { Search, X } from "lucide-react";
import Input from "../Input/Input";
import styles from "./SearchInput.module.scss";

type SearchInputProps = {
  value: string;
  onValueChange: (value: string) => void;
  // Read out by screen readers; the field has no visible label.
  label: string;
  placeholder?: string;
};

// A filter field for lists: a search icon, and a clear button once there's
// text.
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onValueChange,
  label,
  placeholder = "Search…",
}) => {
  return (
    <div className={styles.search}>
      <Search size={18} className={styles.icon} aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        // The keyboard's Search key just puts the keyboard away: the list
        // already filters as you type.
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="search"
        className={styles.input}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear search"
          onClick={() => onValueChange("")}
        >
          <X size={18} aria-hidden />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
