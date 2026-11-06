import { PublicProviderList } from '@/components/public-provider-list';
export function MarketplaceDiscovery({ collection }: { collection: 'salons' | 'professionals' }) {
  return <PublicProviderList role={collection === 'salons' ? 'salon' : 'professional'} />;
}
