// "6.8", "3.0", or "12" from ten up: averages, not counts.
export const formatAbout = (value: number) => {
  const digits = value >= 10 ? 0 : 1;
  return value.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// "7%", or "<1%".
export const formatChance = (odds: number) =>
  odds < 0.005 ? "<1%" : `${Math.round(odds * 100)}%`;
