import { FC } from "react";

import { PageLayoutProps } from "./PageLayout.types";
import { Flex } from "@/components/ui";

const PageLayout: FC<PageLayoutProps> = ({ children, gap = "5" }) => {
  return (
    <Flex direction="column" gap={gap} minHeight="100%">
      {children}
    </Flex>
  );
};

export default PageLayout;
