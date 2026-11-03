import type React from "react";
import { Flex, Heading, Text } from "@/components/ui";
import styles from "./SetupStep.module.scss";

type SetupStepProps = {
  // "Step 1 of 2", above the heading.
  progress?: string;
  title: string;
  desc?: React.ReactNode;
  children?: React.ReactNode;
  // The buttons, kept in view at the bottom while the step scrolls, and what's
  // picked so far beside them.
  actions: React.ReactNode;
  status?: React.ReactNode;
};

const SetupStep: React.FC<SetupStepProps> = ({
  progress,
  title,
  desc,
  children,
  actions,
  status,
}) => (
  <div className={styles.step}>
    <Flex direction="column" gap="2">
      {progress && (
        <Text size="2" weight="bold" color="gray">
          {progress}
        </Text>
      )}
      <Heading as="h1" size="5">
        {title}
      </Heading>
      {desc && (
        <Text size="3" color="gray">
          {desc}
        </Text>
      )}
    </Flex>
    {children}
    <div className={styles.step_footer}>
      {status && <span className={styles.step_status}>{status}</span>}
      <span className={styles.step_actions}>{actions}</span>
    </div>
  </div>
);

export default SetupStep;
