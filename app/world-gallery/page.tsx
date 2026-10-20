import { notFound } from "next/navigation";

import { WorldGallery } from "@/components/world-gallery";

export const dynamic = "force-dynamic";

export default function WorldGalleryPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <WorldGallery />;
}
