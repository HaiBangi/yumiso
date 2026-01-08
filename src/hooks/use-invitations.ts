"use client";

import { useState, useEffect } from "react";

export function useInvitations() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    try {
      const res = await fetch("/api/invitations/count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error("Error fetching invitation count:", error);
    }
  };

  useEffect(() => {
    // Charger le nombre d'invitations au montage initial
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCount();
  }, []);

  const refresh = () => {
    fetchCount();
  };

  return {
    count,
    refresh,
  };
}
