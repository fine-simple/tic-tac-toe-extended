import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for authenticated user
    const getUser = async () => {
      const {
        data: { session },
      } = await db.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        // If no authenticated user, get/create guest ID
        const guestId =
          localStorage.getItem("guestId") ||
          `guest_${Math.random().toString(36).substring(2)}`;
        localStorage.setItem("guestId", guestId);
        setUserId(guestId);
      }
    };

    getUser();
  }, []);

  return userId;
}
