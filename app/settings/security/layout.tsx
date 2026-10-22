import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devices and security | Styld",
  description: "Review the devices signed in to your Styld account and your recent account activity.",
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
