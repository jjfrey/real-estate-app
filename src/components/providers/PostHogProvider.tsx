"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { getSiteId } from "@/lib/site-config";
import { useCookieConsent } from "@/components/providers/CookieConsentProvider";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useCookieConsent();
  const initializedRef = useRef(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) return;

    if (consent === "accepted" && !initializedRef.current) {
      posthog.init(key, {
        api_host: host || "https://us.i.posthog.com",
        capture_pageview: true,
        capture_pageleave: true,
      });
      posthog.register({ site_id: getSiteId() });
      initializedRef.current = true;
    }

    if (consent === "declined" && initializedRef.current) {
      posthog.opt_out_capturing();
      posthog.clear_opt_in_out_capturing();
      initializedRef.current = false;
    }
  }, [consent]);

  if (!initializedRef.current) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
