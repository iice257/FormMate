// @ts-nocheck

export const SIDEBAR_MIN_RATIO = 0.15;
export const SIDEBAR_MAX_RATIO = 0.30;
export const SIDEBARS_TOTAL_MAX_RATIO = 0.40;

export function clampSidebarWidth(width, {
  viewportWidth = window.innerWidth || 1200,
  oppositeWidth = 0,
  minRatio = SIDEBAR_MIN_RATIO,
  maxRatio = SIDEBAR_MAX_RATIO,
  totalMaxRatio = SIDEBARS_TOTAL_MAX_RATIO,
  fixedMinimum = 0,
} = {}) {
  const minWidth = Math.max(fixedMinimum, Math.round(viewportWidth * minRatio));
  const perSidebarMax = Math.round(viewportWidth * maxRatio);
  const totalMax = Math.round(viewportWidth * totalMaxRatio);
  const availableMax = Math.max(minWidth, Math.min(perSidebarMax, totalMax - Math.max(0, oppositeWidth)));
  return Math.max(minWidth, Math.min(availableMax, Math.round(width)));
}

export function clampSidebarPair(primaryWidth, secondaryWidth, viewportWidth = window.innerWidth || 1200) {
  const primary = clampSidebarWidth(primaryWidth, { viewportWidth, oppositeWidth: secondaryWidth });
  const secondary = clampSidebarWidth(secondaryWidth, { viewportWidth, oppositeWidth: primary });
  return { primary, secondary };
}

export function getSidebarRange({
  viewportWidth = window.innerWidth || 1200,
  oppositeWidth = 0,
  minRatio = SIDEBAR_MIN_RATIO,
  maxRatio = SIDEBAR_MAX_RATIO,
  totalMaxRatio = SIDEBARS_TOTAL_MAX_RATIO,
  fixedMinimum = 0,
} = {}) {
  const min = Math.max(fixedMinimum, Math.round(viewportWidth * minRatio));
  const perSidebarMax = Math.round(viewportWidth * maxRatio);
  const totalMax = Math.round(viewportWidth * totalMaxRatio);
  const max = Math.max(min, Math.min(perSidebarMax, totalMax - Math.max(0, oppositeWidth)));
  return { min, max };
}
