export interface TourTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface TourViewport {
  width: number;
  height: number;
}

export type TourSide = "top" | "bottom" | "left" | "right";

export interface TourGuideLayout {
  mode: "anchored" | "center" | "sheet";
  spotlight: boolean;
  side?: TourSide;
  style: {
    position: "fixed";
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
    width?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    transform?: string;
    margin?: string;
  };
}

export const TOUR_MOBILE_BREAKPOINT = 768;
export const TOUR_CARD_GAP = 14;
export const TOUR_VIEWPORT_MARGIN = 12;

export function isTourTargetUsable(
  rect: TourTargetRect | null,
  viewport: TourViewport
): boolean {
  if (!rect || viewport.width <= 0 || viewport.height <= 0) return false;
  if (!(rect.width > 0) || !(rect.height > 0)) return false;

  const visibleWidth = Math.max(
    0,
    Math.min(viewport.width, rect.right) - Math.max(0, rect.left)
  );
  const visibleHeight = Math.max(
    0,
    Math.min(viewport.height, rect.bottom) - Math.max(0, rect.top)
  );

  const coverageWidth = Math.min(rect.width, viewport.width);
  const coverageHeight = Math.min(rect.height, viewport.height);

  return (
    visibleWidth / coverageWidth >= 0.75 && visibleHeight / coverageHeight >= 0.75
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function rectsOverlap(a: TourTargetRect, b: TourTargetRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function centeredLayout(width: number, height: number): TourGuideLayout {
  return {
    mode: "center",
    spotlight: false,
    style: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width,
      maxWidth: "calc(100vw - 24px)",
      maxHeight: height,
    },
  };
}

export function computeTourGuideLayout({
  targetRect,
  viewport,
  cardWidth = 420,
  cardHeight = 320,
  preferredPlacement = "bottom",
}: {
  targetRect: TourTargetRect | null;
  viewport: TourViewport;
  cardWidth?: number;
  cardHeight?: number;
  preferredPlacement?: TourSide | "center";
}): TourGuideLayout {
  const vw = Math.max(0, Math.round(viewport.width));
  const vh = Math.max(0, Math.round(viewport.height));
  const margin = TOUR_VIEWPORT_MARGIN;

  if (vw <= 0 || vh <= 0) {
    return centeredLayout(280, Math.max(160, vh - margin * 2));
  }

  if (vw < TOUR_MOBILE_BREAKPOINT) {
    const maxHeight = Math.max(168, Math.min(Math.round(vh * 0.46), vh - margin * 2));
    const sheetTop = vh - maxHeight - margin;
    const target = targetRect;
    const spotlight =
      isTourTargetUsable(target, viewport) &&
      !!target &&
      target.top >= 0 &&
      target.bottom <= sheetTop;

    return {
      mode: "sheet",
      spotlight,
      style: {
        position: "fixed",
        left: margin,
        right: margin,
        bottom: margin,
        width: vw - margin * 2,
        maxWidth: 460,
        maxHeight,
        margin: "0 auto",
      },
    };
  }

  const width = Math.max(240, Math.min(cardWidth, vw - margin * 2));
  const height = Math.max(160, Math.min(cardHeight, vh - margin * 2));

  if (!targetRect || !isTourTargetUsable(targetRect, viewport)) {
    return centeredLayout(width, Math.max(160, vh - margin * 2));
  }

  const target = targetRect;
  const space = {
    right: vw - target.right - margin,
    left: target.left - margin,
    bottom: vh - target.bottom - margin,
    top: target.top - margin,
  };
  const fits = {
    right: space.right >= width + TOUR_CARD_GAP,
    left: space.left >= width + TOUR_CARD_GAP,
    bottom: space.bottom >= height + TOUR_CARD_GAP,
    top: space.top >= height + TOUR_CARD_GAP,
  };

  const preferred: TourSide =
    preferredPlacement === "top" ||
    preferredPlacement === "left" ||
    preferredPlacement === "right"
      ? preferredPlacement
      : "bottom";
  const opposite: Record<TourSide, TourSide> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };
  const placementOrder: TourSide[] = [
    preferred,
    opposite[preferred],
    ...(["right", "left", "bottom", "top"] as TourSide[]).filter(
      (side) => side !== preferred && side !== opposite[preferred]
    ),
  ];
  const side = placementOrder.find((candidate) => fits[candidate]);
  if (!side) return centeredLayout(width, Math.max(160, vh - margin * 2));

  const centeredLeft = clamp(
    target.left + target.width / 2 - width / 2,
    margin,
    vw - width - margin
  );
  const centeredTop = clamp(
    target.top + target.height / 2 - height / 2,
    margin,
    vh - height - margin
  );

  let left = centeredLeft;
  let top = centeredTop;

  if (side === "right") {
    left = target.right + TOUR_CARD_GAP;
    top = centeredTop;
  } else if (side === "left") {
    left = target.left - TOUR_CARD_GAP - width;
    top = centeredTop;
  } else if (side === "bottom") {
    top = target.bottom + TOUR_CARD_GAP;
    left = centeredLeft;
  } else {
    top = target.top - TOUR_CARD_GAP - height;
    left = centeredLeft;
  }

  left = clamp(left, margin, vw - width - margin);
  top = clamp(top, margin, vh - height - margin);

  const cardRect: TourTargetRect = {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };

  if (rectsOverlap(cardRect, target)) {
    return centeredLayout(width, Math.max(160, vh - margin * 2));
  }

  return {
    mode: "anchored",
    spotlight: true,
    side,
    style: {
      position: "fixed",
      top,
      left,
      width,
      maxHeight: vh - margin * 2,
    },
  };
}

export function getNextTourStepIndex(index: number, total: number): number {
  return Math.min(Math.max(index, 0) + 1, Math.max(total - 1, 0));
}

export function getPreviousTourStepIndex(index: number): number {
  return Math.max(0, index - 1);
}

export function isFinalTourStep(index: number, total: number): boolean {
  return total > 0 && index >= total - 1;
}

export function routeMatchesStep(
  requiredRoute: string,
  pathname: string,
  search = ""
): boolean {
  const [requiredPath, requiredQuery = ""] = requiredRoute.split("?");
  if (pathname !== requiredPath) return false;
  if (!requiredQuery) return true;

  const required = new URLSearchParams(requiredQuery);
  const actual = new URLSearchParams(search);
  for (const [key, value] of required.entries()) {
    if (actual.get(key) !== value) return false;
  }
  return true;
}
