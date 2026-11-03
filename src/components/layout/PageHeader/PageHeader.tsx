import type React from "react";
import { Box, Button, Flex, Grid, Heading, Text } from "@/components/ui";
import { ChevronLeft, PlusIcon, Settings2 } from "lucide-react";

type PageHeaderProps = {
  headline: string;
  desc?: string;
  type?: string;
  onAdd?: () => void;
  hasBack?: boolean;
  // Shows an "Edit {type}" button (single pages).
  onEdit?: () => void;
  size?: "default" | "small";
  actions?: React.ReactNode;
  // Shown before the headline.
  icon?: React.ReactNode;
};

const PageHeader: React.FC<PageHeaderProps> = ({
  headline,
  desc,
  type,
  onAdd,
  hasBack = false,
  onEdit,
  size = "default",
  actions,
  icon,
}) => {
  const isSmall = size === "small";

  const hasAddButton = typeof onAdd === "function";
  return (
    <Grid
      areas={{
        initial: `"heading actions" "description description"`,
        md: `"heading actions" "description description"`,
      }}
      columns={{ initial: "1fr auto", md: "1fr auto auto" }}
      align="center"
      gapX="4"
      gapY="1"
    >
      <Flex gridArea="heading" align="center" gap="3" minWidth="0">
        {icon}
        <Heading
          size={
            isSmall ? { initial: "3", md: "4" } : { initial: "5", md: "6" }
          }
          as="h2"
          weight={isSmall ? "semibold" : "bold"}
          minWidth="0"
          truncate
        >
          {headline}
        </Heading>
      </Flex>

      <Flex gridArea="actions" align="center" gap="2">
        {actions}
        {hasAddButton && (
          <Button onClick={onAdd} aria-label={`Add ${type ?? ""}`.trim()}>
            <PlusIcon strokeWidth={2} size={20} aria-hidden />
            <Box display={{ initial: "none", md: "block" }}>Add {type}</Box>
          </Button>
        )}
        {hasBack && (
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            aria-label="Back"
          >
            <ChevronLeft strokeWidth={2} size={20} aria-hidden />
            <Box display={{ initial: "none", md: "block" }}>Back</Box>
          </Button>
        )}
        {onEdit && type && (
          <Button
            variant="secondary"
            onClick={onEdit}
            aria-label={`Edit ${type}`}
          >
            <Settings2 strokeWidth={2} size={20} aria-hidden />
            <Box display={{ initial: "none", md: "block" }}>Edit {type}</Box>
          </Button>
        )}
      </Flex>

      <Box gridArea="description">
        {desc && (
          <Text color="gray" as="p" size="2">
            {desc}
          </Text>
        )}
      </Box>
    </Grid>
  );
};

export default PageHeader;
