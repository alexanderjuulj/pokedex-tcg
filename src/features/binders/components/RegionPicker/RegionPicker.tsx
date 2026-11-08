import type React from "react";
import { GroupCard } from "@/features/pokedex/components";
import { REGIONS } from "@/features/pokedex/constants";
import type { Region } from "@/features/pokedex/types";
import styles from "./RegionPicker.module.scss";

type RegionPickerProps = {
  value: Region[];
  onChange: (value: Region[]) => void;
  // Regions a Pokédex binder already keeps, shown but not to pick again.
  taken?: Region[];
};

// The regions to collect, tapped on and off.
const RegionPicker: React.FC<RegionPickerProps> = ({ value, onChange, taken = [] }) => (
  <div className={styles.picker}>
    {REGIONS.map((region) => {
      const isTaken = taken.includes(region.value);
      return (
        <GroupCard
          key={region.value}
          label={region.label}
          eyebrow={region.generation}
          artwork={region.starters}
          total={region.last - region.first + 1}
          active={value.includes(region.value)}
          disabled={isTaken}
          detail={isTaken ? "In a binder" : undefined}
          onSelect={() =>
            onChange(
              value.includes(region.value)
                ? value.filter((picked) => picked !== region.value)
                : [...value, region.value],
            )
          }
        />
      );
    })}
  </div>
);

export default RegionPicker;
