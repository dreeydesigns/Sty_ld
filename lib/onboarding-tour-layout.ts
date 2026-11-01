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

export interface TourBand {
  top: number;
  bottom: number;
}

export interface TourGuideLayout {
  mode: "anchored" | "center" | "sheet";
  spotlight: boolean;
  side?: TourSide;
  anchor?: "top" | "bottom";
  band?: TourBand;
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
export const TOUR_MIN_CARD_HEIGHT = 168;
export const TOUR_MOBILE_CARD_RATIO = 0.4;
/** The breathing room the drawn ring adds around the target; the card has to clear this box. */
export const TOUR_HIGHLIGHT_PADDING = 8;

/**
 * The part of a target a visitor can actually see. A tab strip inside a horizontal scroller
 * reports a box wider than the screen, and a spotlight cutout drawn on the whole box puts its
 * ring off-screen, so the highlight is drawn on the intersection instead.
 */
export function visibleTourRect(
  rect: TourTargetRect,
  viewport: TourViewport
): TourTargetRect | null {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(viewport.width, rect.right);
  const bottom = Math.min(viewport.height, rect.bottom);
  if (right - left < 8 || bottom - top < 8) return null;
  return { top, left, width: right - left, height: bottom - top, bottom, right };
}

/**
 * The box the highlight is painted in: the target grown by its padding, then cut back to the
 * screen. Padding a clamped rect pushes it off-device again by exactly the padding.
 */
export function tourHighlightBox(
  rect: TourTargetRect,
  viewport: TourViewport,
  padding: number
): TourTargetRect | null {
  return visibleTourRect(
    {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      bottom: rect.bottom + padding,
      right: rect.right + padding,
    },
    viewport
  );
}

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

/**
 * The page scrolls that would seat a target beside a readable guide card, in viewport-relative
 * pixels, best band first. A listing card taller than the space around it fits once the page
 * moves, and the founder's screenshots showed the tour dimming a page instead of moving it. An
 * empty list means no scroll seats it and the step is a plain centered card.
 *
 * `room` is how far the page can still travel in each direction, so a scroll the document cannot
 * perform is not offered. Three quarters of the target has to stay on screen for the tour to keep
 * measuring it, which is what bounds how tall a target a given seat can hold.
 */
export function tourRevealScrolls(
  rect: TourTargetRect,
  viewport: TourViewport,
  room: { up: number; down: number } = { up: Infinity, down: Infinity }
): number[] {
  const vh = Math.round(viewport.height);
  if (vh <= 0) return [];
  const band = TOUR_MIN_CARD_HEIGHT + TOUR_CARD_GAP + TOUR_HIGHLIGHT_PADDING;
  const bottomSeat = vh - TOUR_VIEWPORT_MARGIN - band;
  const topSeat = TOUR_VIEWPORT_MARGIN + band;
  if (rect.bottom <= bottomSeat || rect.top >= topSeat) return [0];

  const scrolls: number[] = [];
  // The card at the bottom of a phone is where the thumb already is, so that band is offered first.
  if (rect.height <= bottomSeat / 0.75) {
    const delta = Math.round(rect.bottom - bottomSeat);
    if (delta <= room.down) scrolls.push(delta);
  }
  if (rect.height <= (vh - topSeat) / 0.75) {
    const delta = Math.round(rect.top - topSeat);
    if (-delta <= room.up) scrolls.push(delta);
  }
  return scrolls;
}

function rectsOverlap(a: TourTargetRect, b: TourTargetRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function centeredLayout(width: number, height: number): TourGuideLayout {
  return {
    mode: "center",
    spotlight: false,
    band: { top: 0, bottom: 0 },
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
  cardHeight: cardHeightHint = 320,
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

  // A step with nothing to point at is a card in the middle of the screen on every
  // width. Making it a bottom sheet dims the page for no reason, which is what the
  // founder's first screenshot showed.
  if (preferredPlacement === "center") {
    return centeredLayout(Math.max(240, Math.min(420, vw - margin * 2)), Math.max(160, vh - margin * 2));
  }

  if (vw < TOUR_MOBILE_BREAKPOINT) {
    const cap = Math.max(
      TOUR_MIN_CARD_HEIGHT,
      Math.min(Math.round(vh * TOUR_MOBILE_CARD_RATIO), vh - margin * 2)
    );
    const target =
      targetRect && isTourTargetUsable(targetRect, viewport) ? targetRect : null;

    const spaceAbove = target ? target.top - margin : 0;
    const spaceBelow = target ? vh - target.bottom - margin : 0;
    const minRoom = TOUR_MIN_CARD_HEIGHT + TOUR_CARD_GAP;

    // The card takes the band it is given, down to the smallest size it can still be read at.
    // Holding it to 40 percent of the screen is what used to put it on top of a listing that needs
    // most of a short phone, which is the thing the founder's screenshots showed.
    let anchor: "top" | "bottom" = "bottom";
    if (target) {
      if (spaceBelow >= minRoom) anchor = "bottom";
      else if (spaceAbove >= minRoom) anchor = "top";
      else anchor = spaceBelow >= spaceAbove ? "bottom" : "top";
    }
    const bandRoom = target ? (anchor === "bottom" ? spaceBelow : spaceAbove) : vh - margin * 2;
    const cardHeight = target
      ? Math.max(
          TOUR_MIN_CARD_HEIGHT,
          Math.min(cap, Math.max(TOUR_MIN_CARD_HEIGHT, Math.round(cardHeightHint)), bandRoom - TOUR_CARD_GAP)
        )
      : Math.min(cap, Math.max(TOUR_MIN_CARD_HEIGHT, Math.round(cardHeightHint)));

    const cardTop = anchor === "bottom" ? Math.max(margin, vh - cardHeight - margin) : margin;
    const cardBottom =
      anchor === "bottom" ? vh - margin : Math.min(vh - margin, margin + cardHeight);
    const band: TourBand =
      anchor === "bottom"
        ? { top: 0, bottom: Math.max(0, cardTop - TOUR_CARD_GAP) }
        : { top: Math.min(vh, cardBottom + TOUR_CARD_GAP), bottom: vh };

    const cardBox: TourTargetRect = {
      top: cardTop,
      left: margin,
      width: vw - margin * 2,
      height: cardBottom - cardTop,
      bottom: cardBottom,
      right: vw - margin,
    };

    // The ring is the box the visitor sees lit up, so it is the box that has to miss the card.
    // Requiring the target to fill only part of the leftover band used to switch the highlight off
    // on short phones, where a listing card legitimately takes most of the screen.
    const spotlight = (() => {
      if (!target || bandRoom < minRoom) return false;
      const ring = tourHighlightBox(target, viewport, TOUR_HIGHLIGHT_PADDING);
      if (!ring) return false;
      return !rectsOverlap(ring, cardBox);
    })();

    if (!target || bandRoom < minRoom) {
      // Nothing to point at, or no band anywhere that can hold a readable card. A plain centered
      // card, rather than a dim layer with nothing lit up inside it.
      return centeredLayout(
        Math.max(240, Math.min(420, vw - margin * 2)),
        Math.max(160, vh - margin * 2)
      );
    }
    return {
      mode: "sheet",
      spotlight,
      anchor,
      band,
      style:
        anchor === "bottom"
          ? {
              position: "fixed",
              left: margin,
              right: margin,
              bottom: margin,
              width: vw - margin * 2,
              maxWidth: 460,
              maxHeight: cardHeight,
              margin: "0 auto",
            }
          : {
              position: "fixed",
              left: margin,
              right: margin,
              top: margin,
              width: vw - margin * 2,
              maxWidth: 460,
              maxHeight: cardHeight,
              margin: "0 auto",
            },
    };
  }

  const width = Math.max(240, Math.min(cardWidth, vw - margin * 2));
  const height = Math.max(160, Math.min(cardHeightHint, vh - margin * 2));

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
    band: { top: 0, bottom: vh },
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
