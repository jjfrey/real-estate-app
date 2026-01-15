"use client";

import { useState } from "react";
import Image from "next/image";
import { LeadCaptureModal } from "./LeadCaptureModal";

interface Agent {
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  phone: string | null;
}

interface Office {
  name: string | null;
  brokerageName: string | null;
}

interface ContactAgentCardProps {
  listingId: number;
  listingAddress: string;
  agent: Agent | null;
  office: Office | null;
}

export function ContactAgentCard({
  listingId,
  listingAddress,
  agent,
  office,
}: ContactAgentCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"info_request" | "tour_request">("info_request");

  const openModal = (type: "info_request" | "tour_request") => {
    setModalType(type);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Contact Agent
        </h3>

        {agent && (
          <div className="flex items-center gap-4 mb-6">
            {agent.photoUrl ? (
              <Image
                src={agent.photoUrl}
                alt={`${agent.firstName} ${agent.lastName}`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {agent.firstName} {agent.lastName}
              </div>
              {office && (
                <div className="text-sm text-gray-600">
                  {office.brokerageName}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => openModal("info_request")}
            className="w-full bg-[#0c87f2] text-white py-3 rounded-lg font-semibold hover:bg-[#0068d0] transition-colors"
          >
            Request Info
          </button>
          <button
            onClick={() => openModal("tour_request")}
            className="w-full border border-[#0c87f2] text-[#0c87f2] py-3 rounded-lg font-semibold hover:bg-[#0c87f2]/5 transition-colors"
          >
            Schedule Tour
          </button>
        </div>

        {agent?.phone && (
          <div className="mt-6 pt-6 border-t text-center">
            <a
              href={`tel:${agent.phone}`}
              className="text-[#0c87f2] font-medium hover:underline"
            >
              {agent.phone}
            </a>
          </div>
        )}
      </div>

      <LeadCaptureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listingId={listingId}
        listingAddress={listingAddress}
        initialType={modalType}
      />
    </>
  );
}
