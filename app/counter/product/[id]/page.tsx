import type { Metadata } from "next";
import { CounterProductDetail } from "@/components/counter-product-detail";

export const metadata: Metadata = {
  title: "Product",
  description: "Beauty product detail — Counter by Mobile Salon.",
};

export default async function CounterProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CounterProductDetail productId={id} />;
}
