import { Suspense } from "react";

import { AppShell } from "@/components/app-shell";
import { DiscoverContent, DiscoverFirstPaint } from "@/components/discover-content";

// The server renders the frame and the first picture; only the part that has to read the address bar
// waits, and it waits behind a boundary of its own. Without that boundary the URL read suspends the
// whole segment, and the visitor is left with whatever the route was given for waiting.
export default function DiscoverPage() {
  return (
    <AppShell currentNav="discover" showFooter>
      <Suspense fallback={<DiscoverFirstPaint />}>
        <DiscoverContent />
      </Suspense>
    </AppShell>
  );
}
