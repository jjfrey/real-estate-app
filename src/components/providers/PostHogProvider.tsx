"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { getSiteId } from "@/lib/site-config";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) return;

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
    });

    // Register site_id as a super property so all events include it
    posthog.register({ site_id: getSiteId() });

    setInitialized(true);
  }, []);

  if (!initialized) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
