import * as React from "react";

import {
  BREAKPOINT_ORDER,
  LAYOUT_KEYS,
  buildResponsiveCss,
  extractLayoutProps,
  hashStyles,
  type Breakpoint,
  type LayoutProps,
  type Responsive,
} from "@/lib/layoutProps";
import { cn } from "@/lib/utils";

// ─── Type scale ──────────────────────────────────────────────────────────────

export type HeadingSize = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type HeadingWeight =
  | "extralight"
  | "light"
  | "regular"
  | "semibold"
  | "bold";
export type HeadingAlign = "left" | "center" | "right";
export type HeadingWrap = "wrap" | "nowrap" | "pretty" | "balance";

// Sizes reference the type scale in src/utils/scss/base/_typography.scss.
const SIZE_SCALE: Record<
  HeadingSize,
  [fontSize: string, lineHeight: string, letterSpacing: string]
> = {
  "1": ["var(--fs-h6)", "var(--lh-deca)", "0em"],
  "2": ["var(--fs-h5)", "var(--lh-deca)", "0em"],
  "3": ["var(--fs-h4)", "var(--lh-deca)", "-0.005em"],
  "4": ["var(--fs-h3)", "var(--lh-base)", "-0.015em"],
  "5": ["var(--fs-h2)", "var(--lh-base)", "-0.02em"],
  "6": ["var(--fs-h1)", "var(--lh-deci)", "-0.02em"],
  "7": ["var(--fs-display-1)", "var(--lh-deci)", "-0.025em"],
  "8": ["var(--fs-display-2)", "var(--lh-centi)", "-0.03em"],
  "9": ["var(--fs-display-3)", "var(--lh-centi)", "-0.035em"],
};

const WEIGHT_MAP: Record<HeadingWeight, string> = {
  extralight: "var(--fw-extralight)",
  light: "var(--fw-light)",
  regular: "var(--fw-regular)",
  semibold: "var(--fw-semi-bold)",
  bold: "var(--fw-bold)",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, l: string) => l.toUpperCase());
}

function headingPropDecls(
  prop: "size" | "weight" | "align" | "wrap",
  value: string,
): Record<string, string> {
  switch (prop) {
    case "size": {
      const [fs, lh, ls] = SIZE_SCALE[value as HeadingSize];
      return { "font-size": fs, "line-height": lh, "letter-spacing": ls };
    }
    case "weight":
      return { "font-weight": WEIGHT_MAP[value as HeadingWeight] ?? value };
    case "align":
      return { "text-align": value };
    case "wrap":
      return { "text-wrap": value };
  }
}

// ─── Editorial <em> accent — stable rule applied to every Heading ────────────

const EM_CLASS = "klq-heading-em";
const EM_RULE = `.${EM_CLASS} em{font-style:italic;font-family:var(--font-italic,var(--font-body));color:var(--accent);font-weight:400}`;

// ─── Props ────────────────────────────────────────────────────────────────────

type HeadingAs = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingBaseProps extends LayoutProps {
  as?: HeadingAs;
  size?: Responsive<HeadingSize>;
  weight?: Responsive<HeadingWeight>;
  align?: Responsive<HeadingAlign>;
  wrap?: Responsive<HeadingWrap>;
  truncate?: boolean;
  /** Raw CSS color or design token, e.g. `"var(--accent)"`. */
  color?: string;
  /** When true and no `color` prop, sets color to `var(--fg)`. */
  highContrast?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

type HeadingH1Props = { as?: "h1" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;
type HeadingH2Props = { as: "h2" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;
type HeadingH3Props = { as: "h3" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;
type HeadingH4Props = { as: "h4" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;
type HeadingH5Props = { as: "h5" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;
type HeadingH6Props = { as: "h6" } & Omit<
  React.HTMLAttributes<HTMLHeadingElement>,
  keyof HeadingBaseProps
>;

export type HeadingProps = HeadingBaseProps &
  (
    | HeadingH1Props
    | HeadingH2Props
    | HeadingH3Props
    | HeadingH4Props
    | HeadingH5Props
    | HeadingH6Props
  );

// ─── Component ───────────────────────────────────────────────────────────────

const LAYOUT_KEYS_SET = new Set<string>(LAYOUT_KEYS);

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  function Heading(props, forwardedRef) {
    const {
      as: Tag = "h2",
      size = "6",
      weight = "semibold",
      align,
      wrap,
      truncate,
      color,
      highContrast,
      className,
      style: styleProp,
      children,
      ...rest
    } = props as HeadingProps & { as?: HeadingAs };

    // Generic layout props (margin, padding, flex-item, grid-item, etc.)
    const {
      rest: passthrough,
      baseStyle,
      responsiveStyles: layoutResponsive,
      hasResponsive: hasLayoutResponsive,
    } = extractLayoutProps(rest as Record<string, unknown>, LAYOUT_KEYS_SET);

    // ── Heading-specific props ───────────────────────────────────────────────

    const headingBaseStyle: Record<string, string> = {
      // Defaults — applied first so explicit props / style override them.
      fontFamily: "var(--font-primary)",
      color: "var(--text-clr)",
      margin: "0",
    };
    const headingResponsive: Partial<
      Record<Breakpoint, Record<string, string>>
    > = {};
    let hasHeadingResponsive = false;

    function applyProp(
      prop: "size" | "weight" | "align" | "wrap",
      value: Responsive<string> | undefined,
    ) {
      if (value === undefined) return;

      if (typeof value === "string") {
        const decls = headingPropDecls(prop, value);
        for (const [k, v] of Object.entries(decls)) {
          headingBaseStyle[kebabToCamel(k)] = v;
        }
        return;
      }

      const responsive = value as Partial<Record<Breakpoint, string>>;
      const hasBreakpoints = BREAKPOINT_ORDER.some(
        (bp) => bp !== "initial" && responsive[bp] !== undefined,
      );

      if (hasBreakpoints) {
        hasHeadingResponsive = true;
        for (const bp of BREAKPOINT_ORDER) {
          const v = responsive[bp];
          if (v === undefined) continue;
          const decls = headingPropDecls(prop, v);
          const bucket = (headingResponsive[bp] ??= {});
          Object.assign(bucket, decls);
        }
      } else {
        const v = responsive["initial"];
        if (v !== undefined) {
          const decls = headingPropDecls(prop, v);
          for (const [k, dv] of Object.entries(decls)) {
            headingBaseStyle[kebabToCamel(k)] = dv;
          }
        }
      }
    }

    applyProp("size", size);
    applyProp("weight", weight);
    applyProp("align", align);
    applyProp("wrap", wrap);

    if (truncate) {
      headingBaseStyle.overflow = "hidden";
      headingBaseStyle.whiteSpace = "nowrap";
      headingBaseStyle.textOverflow = "ellipsis";
      // overflow: hidden clips descenders (g, y, p) at tight line-heights;
      // pad the clip box without moving the text.
      headingBaseStyle.paddingBlock = "0.1em";
      headingBaseStyle.marginBlock = "-0.1em";
    }

    if (color) {
      headingBaseStyle.color = color;
    } else if (highContrast) {
      headingBaseStyle.color = "var(--text-clr)";
    }

    // ── Merge responsive style maps ──────────────────────────────────────────

    const allResponsive: Partial<Record<Breakpoint, Record<string, string>>> = {
      ...layoutResponsive,
    };
    for (const bp of Object.keys(headingResponsive) as Breakpoint[]) {
      allResponsive[bp] = {
        ...(allResponsive[bp] ?? {}),
        ...headingResponsive[bp],
      };
    }

    const hasResponsive = hasLayoutResponsive || hasHeadingResponsive;

    let responsiveClass: string | undefined;
    let responsiveCss = "";
    if (hasResponsive) {
      responsiveClass = `klq-heading-${hashStyles(allResponsive)}`;
      responsiveCss = buildResponsiveCss(responsiveClass, allResponsive);
    }

    // Always emit the editorial <em> accent rule, scoped to the stable EM_CLASS
    // on the root element so it never leaks to consumer DOM.
    const css = responsiveCss + EM_RULE;

    const mergedStyle: React.CSSProperties = {
      ...baseStyle,
      ...(headingBaseStyle as React.CSSProperties),
      ...styleProp,
    };

    const Comp = Tag as React.ElementType;

    return (
      <Comp
        ref={forwardedRef}
        className={cn(EM_CLASS, responsiveClass, className)}
        style={mergedStyle}
        {...passthrough}
      >
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {children}
      </Comp>
    );
  },
);

export default Heading;
