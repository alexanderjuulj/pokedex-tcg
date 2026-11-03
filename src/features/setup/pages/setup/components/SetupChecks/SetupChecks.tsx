import type React from "react";
import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useSets } from "@/hooks/queries";
import { artUrl } from "@/lib/pokemon";
import { cn } from "@/lib/utils";
import styles from "./SetupChecks.module.scss";

// Whether an image loads: the artwork isn't in the repository, so a fresh
// checkout may not have it yet.
function useImageLoads(src: string) {
  const [loads, setLoads] = useState<boolean | null>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setLoads(true);
    image.onerror = () => setLoads(false);
    image.src = src;
  }, [src]);
  return loads;
}

type CheckProps = {
  ok: boolean;
  title: string;
  children: React.ReactNode;
};

const Check: React.FC<CheckProps> = ({ ok, title, children }) => (
  <li className={cn(styles.check, !ok && styles.check__todo)}>
    {ok ? (
      <CircleCheck size={22} aria-hidden className={styles.check_icon} />
    ) : (
      <CircleAlert size={22} aria-hidden className={styles.check_icon} />
    )}
    <span className={styles.check_title}>{title}</span>
    <span className={styles.check_body}>{children}</span>
  </li>
);

// What the app needs from the computer it runs on, pulled once with the
// commands in the README: the card catalogue and the Pokémon artwork.
const SetupChecks: React.FC = () => {
  const sets = useSets();
  const artwork = useImageLoads(artUrl(25));

  if (sets.isLoading || artwork === null) return <Spinner />;
  const setCount = sets.data?.length ?? 0;

  return (
    <ul className={styles.checks}>
      {setCount > 0 ? (
        <Check ok title="Card catalogue">
          {`${setCount} sets of printed cards to pick from.`}
        </Check>
      ) : (
        <Check ok={false} title="Card catalogue">
          No printed cards to pick from yet. On the computer running the app, run{" "}
          <code>pnpm catalog:pull</code> (about an hour the first time).
        </Check>
      )}
      {artwork ? (
        <Check ok title="Pokémon artwork">
          Every Pokémon has its picture.
        </Check>
      ) : (
        <Check ok={false} title="Pokémon artwork">
          The pictures are missing, so a Poké Ball stands in. On the computer running the app,
          run <code>pnpm pokemon:art</code>.
        </Check>
      )}
    </ul>
  );
};

export default SetupChecks;
