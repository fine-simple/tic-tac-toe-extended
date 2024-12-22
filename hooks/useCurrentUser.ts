import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for authenticated user
    const getUser = async () => {
      let userId: string | null = null;
      const {
        data: { session },
      } = await db.auth.getSession();
      if (session?.user) {
        userId = session.user.id;
      } else {
        // If no authenticated user, get/create guest ID
        const guestId =
          localStorage.getItem("guestId") ||
          `guest_${Math.random().toString(36).substring(2)}`;
        localStorage.setItem("guestId", guestId);
        userId = guestId;
      }
      setUserId(userId);
    };

    getUser();
  }, []);

  return userId;
}
