import React from "react";
import { cn } from "@/lib/utils";
import styles from "./Skeleton.module.scss";

type SkeletonProps = {
  /** Set to false to render the children as-is (e.g. once data has loaded). */
  loading?: boolean;
  children: React.ReactElement<{ className?: string }>;
};

// Applies the skeleton class to the child element itself rather than wrapping
// it, so layout props on the child (gridArea, flex, etc.) keep working.
const Skeleton: React.FC<SkeletonProps> = ({ loading = true, children }) => {
  if (!loading) return children;

  return React.cloneElement(children, {
    className: cn(styles.skeleton, children.props.className),
    "aria-hidden": true,
    inert: true,
  } as React.HTMLAttributes<HTMLElement>);
};

export default Skeleton;
