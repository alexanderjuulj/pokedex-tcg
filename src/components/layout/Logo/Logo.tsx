import React from "react";
import { Link } from "react-router";
import { APP_TITLE } from "@/constants/app";
import { cn } from "@/lib/utils";
import styles from "./Logo.module.scss";

interface LogoProps {
  size?: "default" | "small";
}

const Logo: React.FC<LogoProps> = ({ size = "default" }) => {
  return (
    <Link to="/" className={cn(styles.logo, styles[size])} aria-label="Home">
      {/* The home-screen icon (`pnpm icons`). */}
      <img src="/icon-192.png" alt="" className={styles.mark} />
      <span className={styles.word}>{APP_TITLE}</span>
    </Link>
  );
};

export default Logo;
