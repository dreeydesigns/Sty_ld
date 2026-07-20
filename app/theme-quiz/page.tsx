import type { Metadata } from "next";

import { ThemeQuizFlow } from "@/components/theme-quiz-flow";

export const metadata: Metadata = {
  title: "Find Your Beauty World",
  description: "An optional Mobile Salon quiz that personalises your beauty discovery feed.",
};

export default function ThemeQuizPage() {
  return <ThemeQuizFlow />;
}
