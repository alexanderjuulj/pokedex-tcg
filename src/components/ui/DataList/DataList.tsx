import * as React from "react";

import type { Responsive } from "@/lib/layoutProps";
import Box from "../Box";
import Flex from "../Flex";
import Grid from "../Grid";
import Text from "../Text";
import styles from "./DataList.module.scss";

// A responsive "table": a header row of column labels on md+, and stacked
// cards on mobile where each cell carries its own label (grid areas decide
// the card layout). Columns/areas live in context so rows and cells don't
// repeat them.

export type DataListColumn = {
  /** Grid area name — also the key cells use to look up their label. */
  area: string;
  /** Header text; "" renders an empty header cell (e.g. an actions column). */
  label: string;
};

type DataListContextValue = {
  columns: DataListColumn[];
  gridColumns: Responsive<string>;
  areas: Responsive<string>;
};

const DataListContext = React.createContext<DataListContextValue | null>(null);

function useDataListContext(component: string): DataListContextValue {
  const ctx = React.useContext(DataListContext);
  if (!ctx) throw new Error(`${component} must be used inside a DataList`);
  return ctx;
}

type DataListProps = DataListContextValue & {
  children: React.ReactNode;
};

const DataList: React.FC<DataListProps> = ({
  columns,
  gridColumns,
  areas,
  children,
}) => (
  <DataListContext.Provider value={{ columns, gridColumns, areas }}>
    <Flex direction="column">
      <Box className={styles.header} display={{ initial: "none", md: "block" }}>
        <Grid columns={gridColumns} gap="4">
          {columns.map((column) => (
            <Text key={column.area} color="gray">
              {column.label}
            </Text>
          ))}
        </Grid>
      </Box>
      <Flex direction="column" gap={{ initial: "3", md: "0" }}>
        {children}
      </Flex>
    </Flex>
  </DataListContext.Provider>
);

type DataListRowProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export const DataListRow: React.FC<DataListRowProps> = ({
  children,
  onClick,
}) => {
  const { gridColumns, areas } = useDataListContext("DataListRow");
  return (
    <Grid
      columns={gridColumns}
      areas={areas}
      gap={{ initial: "2", md: "4" }}
      align="center"
      className={`${styles.row} ${onClick ? styles.row_clickable : ""}`}
      onClick={onClick}
    >
      {children}
    </Grid>
  );
};

type DataListCellProps = {
  area: string;
  /** Overrides the column label on mobile; "" hides it. */
  label?: string;
  children: React.ReactNode;
};

export const DataListCell: React.FC<DataListCellProps> = ({
  area,
  label,
  children,
}) => {
  const { columns } = useDataListContext("DataListCell");
  const resolvedLabel =
    label ?? columns.find((column) => column.area === area)?.label ?? "";
  return (
    <Flex gridArea={area} direction="column" gap="1">
      {resolvedLabel && (
        <Box display={{ initial: "block", md: "none" }}>
          <Text size="1" color="gray">
            {resolvedLabel}
          </Text>
        </Box>
      )}
      {/* div, not span, so cells can hold block content (badges, stacks). */}
      <Text as="div" size="1" truncate>
        {children}
      </Text>
    </Flex>
  );
};

type DataListSectionProps = {
  children: React.ReactNode;
};

export const DataListSection: React.FC<DataListSectionProps> = ({
  children,
}) => (
  <Box className={styles.section}>
    <Text size="1" weight="medium">
      {children}
    </Text>
  </Box>
);

export default DataList;
