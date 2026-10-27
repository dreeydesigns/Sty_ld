# Compare mobile acceptance

The production build uses mocked canonical APIs and synthetic media. The browser harness disables the server database and external email. It does not prove live authentication, persistence or screen-reader operation.

## Text scaling defect and fix

The row labels used an absolute 10px font size. A rendered regression failed when the root font increased from 16px to 32px: values grew to 24px but row labels stayed at 10px. The smallest fix uses 0.625rem. Labels now grow from 10px to 20px. TypeScript, lint (31 existing warnings), all 666 unit tests and the production build pass. The four rendered scaling checks pass.

## Measured layout limit

At 360px, two columns measure 163.5px with normal text and 147.5px with enlarged text. Three columns measure 109px and approximately 98.33px respectively. Three enlarged-text header cells clip their content. Zero document-level overflow is not proof of readability. Long names wrap extensively. The current three-column interaction remains experimental and needs a founder decision before release.

The tray occupies 62px of a 900px viewport with normal text and 122px with enlarged text. It clears the bottom navigation in these checks. Measured controls meet 44px dimensions at normal text. Enlarged controls can exceed their narrow cell, which is a separate layout failure.

## Smallest proposed alternative, approval required

The standalone compare-layout-proposal.html retains three providers and the same decision rows. It uses a native horizontally scrollable, keyboard-focusable region with columns approximately 160px wide, increasing to 320px with enlarged text. Both prototype checks show zero clipped cells and successful ArrowRight scrolling. It uses fictional Demo names and unknown prices. It is not connected to application state, accounts or APIs.

The screenshots were visually inspected. Horizontal scrolling keeps readable text but hides part of the comparison until the reader scrolls. Founder review should decide whether this tradeoff is acceptable. No replacement layout has been applied to the application.

## Evidence limits

The initial enlarged-text measurement raced style application. Corrected tests wait for the computed root font and two animation frames. browser-readability-before.json preserves the corrected pre-fix measurements; browser-readability.json records the passing label fix and remaining clipping. Historical initial measurements are not accepted as scaling proof.

Accessibility evidence includes actual keyboard interactions, focus checks, accessibility snapshots and reduced-motion contexts. No actual screen-reader session or browser zoom session was performed. A human usability walkthrough remains outstanding.
