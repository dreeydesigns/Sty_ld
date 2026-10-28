"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { readAppSession } from "@/lib/client-session";
import { saveGuestReturn } from "@/lib/guest-session";

interface MessageButtonProps {
  targetId: string;
  targetName: string;
  className?: string;
}

export function MessageButton({ targetName, className }: MessageButtonProps) {
  const router = useRouter();

  function handleClick() {
    const session = readAppSession();
    if (!session) {
      // Not signed in, go to profile (where messages tab lives) after sign-in
      router.push("/auth/sign-in?returnTo=/profile");
      return;
    }

    if (session.role === "guest") {
      saveGuestReturn("/profile?tab=messages");
      router.push("/signup/client?returnTo=/profile%3Ftab%3Dmessages");
      return;
    }

    // CONTAINMENT (Phase 8B-A): messaging is not backed by an authorised,
    // account-owned service, so no browser-local thread is created here. The
    // user is sent to the honest "unavailable" state on the messages tab.
    router.push("/profile?tab=messages");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Message ${targetName}`}
      className={[
        "inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20",
        className ?? "",
      ].join(" ")}
    >
      <MessageCircle className="h-4 w-4" />
      Message
    </button>
  );
}
