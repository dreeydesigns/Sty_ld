import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { MarketplaceDiscovery } from "@/components/discovery";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;

  if (collection !== "salons" && collection !== "professionals") {
    notFound();
  }

  return (
    <AppShell currentNav={collection} roleMode={collection}>
      <MarketplaceDiscovery collection={collection} />
    </AppShell>
  );
}
