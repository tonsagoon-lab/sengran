const VIEW_COUNT_MIN = 20;

export function publicViewCount(
  viewCount: number | null | undefined,
  seed: number | null | undefined
): number | null {
  if (viewCount == null || viewCount < VIEW_COUNT_MIN) return null;
  return viewCount + (seed ?? 0);
}
