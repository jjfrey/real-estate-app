"use client";

export function BackToSearch() {
  const handleBackClick = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/search";
    }
  };

  return (
    <button
      onClick={handleBackClick}
      className="flex items-center gap-2 text-[#0c87f2] hover:text-[#0068d0] font-medium transition-colors"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>Back to Search</span>
    </button>
  );
}
