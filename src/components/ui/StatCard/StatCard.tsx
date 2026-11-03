import type React from "react";
import { cn } from "@/lib/utils";
import Text from "../Text";
import styles from "./StatCard.module.scss";
import Grid from "../Grid";
import Box from "../Box";
import Flex from "../Flex";
import Skeleton from "../Skeleton/Skeleton";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  // Colors the value (e.g. profit green/red); omit for neutral.
  tone?: "positive" | "negative";
  // Secondary line under the value, e.g. the change vs last month.
  hint?: React.ReactNode;
};

const StatCard: React.FC<StatCardProps> = ({ label, value, tone, hint }) => {
  return (
    <Box className={styles.card}>
      <Flex direction="column" gap="1">
        <Text size="1" color="gray" truncate>
          {label}
        </Text>
        {value === 0 ? (
          <Skeleton>
            <Text size="4" weight="bold" className={cn(tone && styles[tone])}>
              0
            </Text>
          </Skeleton>
        ) : (
          <Text size="4" weight="bold" className={cn(tone && styles[tone])}>
            {value}
          </Text>
        )}
        {hint && (
          <Text as="div" size="1" color="gray">
            {hint}
          </Text>
        )}
      </Flex>
    </Box>
  );
};

export const StatCardGrid: React.FC<{
  children: React.ReactNode;
  columns?: React.ComponentProps<typeof Grid>["columns"];
}> = ({ children, columns = { initial: "2", md: "4" } }) => {
  return (
    <Grid gap="3" columns={columns} mb="3">
      {children}
    </Grid>
  );
};

export default StatCard;
