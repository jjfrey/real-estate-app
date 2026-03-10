"use client";

import Link from "next/link";
import { useCookieConsent } from "@/components/providers/CookieConsentProvider";

export function CookieConsentBanner() {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== "pending") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <p className="text-sm text-gray-700">
        We use cookies to analyze site usage and improve your experience.{" "}
        <Link href="/privacy" className="text-brand underline hover:text-brand-hover">
          Privacy Policy
        </Link>
      </p>
      <div className="mt-3 flex gap-3 sm:mt-0 sm:shrink-0">
        <button
          onClick={decline}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
