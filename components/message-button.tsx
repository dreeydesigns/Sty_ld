"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getOrCreateThreadId,
  sendMessage,
  readThreads,
} from "@/lib/social-store";
import { readAppSession } from "@/lib/client-session";
import { saveGuestReturn } from "@/lib/guest-session";

interface MessageButtonProps {
  targetId: string;
  targetName: string;
  className?: string;
}

export function MessageButton({ targetId, targetName, className }: MessageButtonProps) {
  const router = useRouter();

  function handleClick() {
    const session = readAppSession();
    if (!session) {
      // Not signed in — go to profile (where messages tab lives) after sign-in
      router.push("/auth/sign-in?returnTo=/profile");
      return;
    }

    if (session.role === "guest") {
      saveGuestReturn("/profile?tab=messages");
      router.push("/signup/client?returnTo=/profile%3Ftab%3Dmessages");
      return;
    }

    const threadId = getOrCreateThreadId(session.id, targetId);

    // Create thread if it doesn't exist yet
    const existing = readThreads().find((t) => t.id === threadId);
    if (!existing) {
      // Seed the thread with a greeting so it appears in the list
      const senderName =
        session.role === "client" ? session.firstName
        : session.role === "professional" ? session.displayName
        : session.role === "salon" ? session.salonName
        : session.role === "shop" ? session.shopName
        : session.role === "delivery" || session.role === "super_admin" ? session.displayName
        : "Mobile Salon user";
      const senderAvatar = "profilePhoto" in session ? session.profilePhoto : undefined;

      sendMessage(
        threadId,
        {
          id: `msg_${Date.now()}`,
          text: `Hi ${targetName}! I found your profile on Mobile Salon and would love to connect.`,
          senderId: session.id,
          senderName,
          senderAvatar,
          createdAt: new Date().toISOString(),
          read: false,
        },
        {
          id: threadId,
          participantIds: [session.id, targetId],
          participantNames: [senderName, targetName],
          participantAvatars: [senderAvatar, undefined],
        },
      );
    }

    // Navigate to the messages tab on the profile page
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
