// Images shown once this session are in the browser's memory cache. Shown
// again (going Back rebuilds a list), they load and decode with the page, so
// they paint at once: lazy loading and async decoding leave them blank for a
// moment in Safari, a visible flicker. The first time, they load as they
// scroll into view.
const loaded = new Set<string>();

export function imageLoading(src: string) {
  const seen = loaded.has(src);
  return {
    loading: seen ? "eager" : "lazy",
    decoding: seen ? "sync" : "async",
    onLoad: () => loaded.add(src),
  } as const;
}
