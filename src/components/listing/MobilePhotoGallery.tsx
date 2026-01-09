"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface Photo {
  id: number;
  url: string;
}

interface MobilePhotoGalleryProps {
  photos: Photo[];
  address: string;
  status: string;
  statusColor: string;
}

export function MobilePhotoGallery({
  photos,
  address,
  status,
  statusColor,
}: MobilePhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const newIndex = Math.max(0, Math.min(index, photos.length - 1));
      scrollRef.current.scrollTo({
        left: newIndex * scrollRef.current.offsetWidth,
        behavior: "smooth",
      });
      setCurrentIndex(newIndex);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.offsetWidth;
      const newIndex = Math.round(scrollLeft / width);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  };

  const goToPrev = () => scrollToIndex(currentIndex - 1);
  const goToNext = () => scrollToIndex(currentIndex + 1);

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] flex items-center justify-center bg-gray-200">
        <svg
          className="w-24 h-24 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-100">
      {/* Photo Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="flex-shrink-0 w-full snap-center relative aspect-[4/3]"
          >
            <Image
              src={photo.url}
              alt={`${address} - Photo ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Status Badge */}
      <div className="absolute top-4 left-4">
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${statusColor}`}
        >
          {status}
        </span>
      </div>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous photo"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === photos.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next photo"
          >
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </>
      )}

      {/* Photo Counter */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Swipe Hint (shows briefly on first load) */}
      <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m-12 5h12m-12 5h12"
          />
        </svg>
        Swipe for more
      </div>
    </div>
  );
}
