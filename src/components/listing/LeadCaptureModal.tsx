"use client";

import { useState } from "react";

interface LeadCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  listingAddress: string;
  initialType?: "info_request" | "tour_request";
}

export function LeadCaptureModal({
  isOpen,
  onClose,
  listingId,
  listingAddress,
  initialType = "info_request",
}: LeadCaptureModalProps) {
  const [leadType, setLeadType] = useState<"info_request" | "tour_request">(initialType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          leadType,
          name,
          email,
          phone: phone || undefined,
          message: message || undefined,
          preferredTourDate: leadType === "tour_request" ? preferredDate || undefined : undefined,
          preferredTourTime: leadType === "tour_request" ? preferredTime || undefined : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setPreferredDate("");
    setPreferredTime("");
    setIsSuccess(false);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {isSuccess ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-600 mb-6">
                {leadType === "tour_request"
                  ? "We'll contact you shortly to confirm your tour."
                  : "An agent will reach out to you soon with more information."}
              </p>
              <button
                onClick={handleClose}
                className="bg-[#0c87f2] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#0068d0] transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Form State */
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {leadType === "tour_request" ? "Schedule a Tour" : "Request Information"}
              </h2>
              <p className="text-sm text-gray-500 mb-6 truncate">{listingAddress}</p>

              {/* Lead Type Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setLeadType("info_request")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    leadType === "info_request"
                      ? "bg-[#0c87f2] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Request Info
                </button>
                <button
                  type="button"
                  onClick={() => setLeadType("tour_request")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    leadType === "tour_request"
                      ? "bg-[#0c87f2] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Schedule Tour
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none"
                    placeholder="Your name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>

                {/* Tour Date/Time (conditional) */}
                {leadType === "tour_request" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Time
                      </label>
                      <select
                        id="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none"
                      >
                        <option value="">Select time</option>
                        <option value="morning">Morning (9am-12pm)</option>
                        <option value="afternoon">Afternoon (12pm-5pm)</option>
                        <option value="evening">Evening (5pm-8pm)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#0c87f2] focus:ring-2 focus:ring-[#0c87f2]/20 outline-none resize-none"
                    placeholder={
                      leadType === "tour_request"
                        ? "Any specific requests for the tour?"
                        : "What would you like to know about this property?"
                    }
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0c87f2] text-white py-3 rounded-lg font-semibold hover:bg-[#0068d0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : leadType === "tour_request" ? (
                    "Request Tour"
                  ) : (
                    "Send Request"
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to be contacted about this property.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
