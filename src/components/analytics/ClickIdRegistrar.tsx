"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function ClickIdRegistrar({ clickId }: { clickId: string }) {
  useEffect(() => {
    if (clickId && posthog.__loaded) {
      posthog.register({ click_id: clickId });
    }
  }, [clickId]);

  return null;
}
