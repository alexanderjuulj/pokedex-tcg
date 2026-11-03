import React, { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router";
import { Box, Flex } from "@/components/ui";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import styles from "./AppLayout.module.scss";
import { ScrollArea } from "@base-ui/react/scroll-area";

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const viewportRef = useRef<HTMLDivElement>(null);
  // How far each history entry was scrolled, so Back returns to the same spot.
  const positions = useRef(new Map<string, number>());
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const pathChanged = location.pathname !== previousPath.current;
    previousPath.current = location.pathname;

    if (navigationType === "POP") {
      // Back or forward. A page whose data is still loading is too short to
      // scroll that far yet, so keep trying for a moment.
      const top = positions.current.get(location.key) ?? 0;
      let attempts = 0;
      let frame = 0;
      const restore = () => {
        viewport.scrollTop = top;
        if (Math.abs(viewport.scrollTop - top) > 1 && ++attempts < 60) {
          frame = requestAnimationFrame(restore);
        }
      };
      restore();
      return () => cancelAnimationFrame(frame);
    }
    // A new page starts at the top; a tab or filter switch (a replace on the
    // same page) keeps its place.
    if (pathChanged) viewport.scrollTo({ top: 0 });
    positions.current.set(location.key, viewport.scrollTop);
  }, [location, navigationType]);

  return (
    <>
      <Sidebar />
      <Flex
        direction="column"
        height="100dvh"
        pl={{ initial: "0", sm: "260px" }}
        className={styles.shell}
      >
        <Header />
        <Flex justify="center" flexGrow="1" minHeight="0">
          <ScrollArea.Root className={styles.scrollRoot}>
            <ScrollArea.Viewport
              ref={viewportRef}
              className={styles.viewport}
              onScroll={(event) =>
                positions.current.set(location.key, event.currentTarget.scrollTop)
              }
            >
              <Box
                className={styles.content}
                px={{ initial: "4", lg: "7" }}
                pt={{ initial: "4", sm: "6" }}
              >
                <Outlet />
              </Box>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Flex>
      </Flex>
    </>
  );
};

export default AppLayout;
