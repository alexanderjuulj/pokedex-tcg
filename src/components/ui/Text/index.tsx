import * as React from 'react'

import {
  BREAKPOINT_ORDER,
  LAYOUT_KEYS,
  buildResponsiveCss,
  extractLayoutProps,
  hashStyles,
  type Breakpoint,
  type LayoutProps,
  type Responsive,
} from '@/lib/layoutProps'
import { cn } from '@/lib/utils'

// ─── Type scale ──────────────────────────────────────────────────────────────

export type TextSize = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type TextWeight = 'light' | 'regular' | 'medium' | 'bold'
export type TextAlign = 'left' | 'center' | 'right'
export type TextWrap = 'wrap' | 'nowrap' | 'pretty' | 'balance'

// One step up from the admin's scale: the app is read at arm's length on a
// phone or tablet, so the smallest size is 14px.
const SIZE_SCALE: Record<TextSize, [fontSize: string, lineHeight: string, letterSpacing: string]> = {
  '1': ['14px', '20px',  '0em'],
  '2': ['16px', '24px',  '0em'],
  '3': ['18px', '26px',  '-0.0025em'],
  '4': ['20px', '28px',  '-0.005em'],
  '5': ['24px', '32px',  '-0.00625em'],
  '6': ['28px', '36px',  '-0.0075em'],
  '7': ['32px', '40px',  '-0.01em'],
  '8': ['40px', '48px',  '-0.015em'],
  '9': ['60px', '68px',  '-0.025em'],
}

const WEIGHT_MAP: Record<TextWeight, string> = {
  light: '300',
  regular: '400',
  medium: '500',
  bold: '700',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, l: string) => l.toUpperCase())
}

// Returns kebab-case declarations — used both for inline style (converted to camelCase)
// and for the responsive <style> block (stays kebab).
function textPropDecls(
  prop: 'size' | 'weight' | 'align' | 'wrap',
  value: string,
): Record<string, string> {
  switch (prop) {
    case 'size': {
      const [fs, lh, ls] = SIZE_SCALE[value as TextSize]
      return { 'font-size': fs, 'line-height': lh, 'letter-spacing': ls }
    }
    case 'weight':
      return { 'font-weight': WEIGHT_MAP[value as TextWeight] ?? value }
    case 'align':
      return { 'text-align': value }
    case 'wrap':
      return { 'text-wrap': value }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type TextAs = 'span' | 'div' | 'p' | 'label'

interface TextBaseProps extends LayoutProps {
  size?: Responsive<TextSize>
  weight?: Responsive<TextWeight>
  align?: Responsive<TextAlign>
  wrap?: Responsive<TextWrap>
  truncate?: boolean
  /** Raw CSS color or design token, e.g. `"var(--accent)"`. */
  color?: string
  /** When true and no `color` prop, sets color to `var(--fg)`. */
  highContrast?: boolean
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

type TextSpanProps  = { as?: 'span'  } & Omit<React.HTMLAttributes<HTMLSpanElement>,      keyof TextBaseProps>
type TextDivProps   = { as:  'div'   } & Omit<React.HTMLAttributes<HTMLDivElement>,        keyof TextBaseProps>
type TextPProps     = { as:  'p'     } & Omit<React.HTMLAttributes<HTMLParagraphElement>,  keyof TextBaseProps>
type TextLabelProps = { as:  'label' } & Omit<React.LabelHTMLAttributes<HTMLLabelElement>, keyof TextBaseProps>

export type TextProps = TextBaseProps & (TextSpanProps | TextDivProps | TextPProps | TextLabelProps)

// ─── Component ───────────────────────────────────────────────────────────────

const LAYOUT_KEYS_SET = new Set<string>(LAYOUT_KEYS)

const Text = React.forwardRef<HTMLElement, TextProps>(function Text(props, forwardedRef) {
  const {
    as: Tag = 'span',
    size,
    weight,
    align,
    wrap,
    truncate,
    color,
    highContrast,
    className,
    style: styleProp,
    children,
    ...rest
  } = props as TextProps & { as?: TextAs }

  // Generic layout props (margin, padding, flex-item, grid-item, etc.)
  const {
    rest: passthrough,
    baseStyle,
    responsiveStyles: layoutResponsive,
    hasResponsive: hasLayoutResponsive,
  } = extractLayoutProps(rest as Record<string, unknown>, LAYOUT_KEYS_SET)

  // ── Text-specific props ──────────────────────────────────────────────────

  const textBaseStyle: Record<string, string> = {}
  const textResponsive: Partial<Record<Breakpoint, Record<string, string>>> = {}
  let hasTextResponsive = false

  function applyProp(prop: 'size' | 'weight' | 'align' | 'wrap', value: Responsive<string> | undefined) {
    if (value === undefined) return

    if (typeof value === 'string') {
      const decls = textPropDecls(prop, value)
      for (const [k, v] of Object.entries(decls)) {
        textBaseStyle[kebabToCamel(k)] = v
      }
      return
    }

    // Responsive object
    const responsive = value as Partial<Record<Breakpoint, string>>
    const hasBreakpoints = BREAKPOINT_ORDER.some((bp) => bp !== 'initial' && responsive[bp] !== undefined)

    if (hasBreakpoints) {
      hasTextResponsive = true
      for (const bp of BREAKPOINT_ORDER) {
        const v = responsive[bp]
        if (v === undefined) continue
        const decls = textPropDecls(prop, v)
        const bucket = (textResponsive[bp] ??= {})
        Object.assign(bucket, decls)
      }
    } else {
      const v = responsive['initial']
      if (v !== undefined) {
        const decls = textPropDecls(prop, v)
        for (const [k, dv] of Object.entries(decls)) {
          textBaseStyle[kebabToCamel(k)] = dv
        }
      }
    }
  }

  applyProp('size',   size)
  applyProp('weight', weight)
  applyProp('align',  align)
  applyProp('wrap',   wrap)

  if (truncate) {
    textBaseStyle.overflow = 'hidden'
    textBaseStyle.whiteSpace = 'nowrap'
    textBaseStyle.textOverflow = 'ellipsis'
  }

  if (color) {
    // "gray" is the muted text token (CSS gray fails contrast on white).
    textBaseStyle.color = color === 'gray' ? 'var(--text-clr-secondary)' : color
  } else if (highContrast) {
    textBaseStyle.color = 'var(--fg)'
  }

  // ── Merge responsive style maps ──────────────────────────────────────────

  const allResponsive: Partial<Record<Breakpoint, Record<string, string>>> = { ...layoutResponsive }
  for (const bp of Object.keys(textResponsive) as Breakpoint[]) {
    allResponsive[bp] = { ...(allResponsive[bp] ?? {}), ...textResponsive[bp] }
  }

  const hasResponsive = hasLayoutResponsive || hasTextResponsive

  let responsiveClass: string | undefined
  let css: string | undefined
  if (hasResponsive) {
    responsiveClass = `klq-text-${hashStyles(allResponsive)}`
    css = buildResponsiveCss(responsiveClass, allResponsive)
  }

  const mergedStyle: React.CSSProperties = {
    ...baseStyle,
    ...(textBaseStyle as React.CSSProperties),
    ...styleProp,
  }

  const Comp = Tag as React.ElementType

  return (
    <Comp
      ref={forwardedRef}
      className={cn(responsiveClass, className)}
      style={mergedStyle}
      {...passthrough}
    >
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {children}
    </Comp>
  )
})

export default Text
