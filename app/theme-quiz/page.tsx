import type { Metadata } from "next";

import { ThemeQuizFlow } from "@/components/theme-quiz-flow";

export const metadata: Metadata = {
  title: "Find Your Beauty World",
  description: "An optional Styld quiz that personalises your beauty discovery feed.",
};

export default async function ThemeQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return <ThemeQuizFlow returnTo={Array.isArray(returnTo) ? returnTo[0] : returnTo} />;
}
