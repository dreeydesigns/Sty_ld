import { AppShell } from '@/components/app-shell';
import { products } from '@/lib/site-data';
export default function CounterPage() {
 return <AppShell currentNav="counter"><h1 className="text-3xl font-semibold">Counter</h1><p className="my-4">Catalogue preview. Seller onboarding, checkout and delivery are not live. These sample listings cannot be purchased.</p><div className="grid gap-4 sm:grid-cols-2">{products.map(product=><article key={product.id} className="rounded-2xl border p-5"><h2 className="font-semibold">{product.name}</h2><p>Sample listing · ordering unavailable</p></article>)}</div></AppShell>;
}
