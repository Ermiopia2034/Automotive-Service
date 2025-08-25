'use client';

import { useState } from 'react';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
}

export default function RatingStars({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showNumber = true
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [focusedStar, setFocusedStar] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const handleClick = (clickedRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(clickedRating);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (!readonly) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, starIndex: number) => {
    if (readonly) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleClick(starIndex);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        if (starIndex > 1) {
          const prevButton = document.querySelector(`[data-star="${starIndex - 1}"]`) as HTMLElement;
          prevButton?.focus();
        }
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        if (starIndex < 10) {
          const nextButton = document.querySelector(`[data-star="${starIndex + 1}"]`) as HTMLElement;
          nextButton?.focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        const firstButton = document.querySelector(`[data-star="1"]`) as HTMLElement;
        firstButton?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastButton = document.querySelector(`[data-star="10"]`) as HTMLElement;
        lastButton?.focus();
        break;
    }
  };

  const getStarFill = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    if (currentRating >= starIndex) {
      return 'text-yellow-400';
    } else if (currentRating >= starIndex - 0.5) {
      return 'text-yellow-200'; // Half star
    }
    return 'text-gray-300';
  };

  const getAriaLabel = (starIndex: number) => {
    if (readonly) {
      return `${starIndex} out of 10 stars`;
    }
    return `Rate ${starIndex} out of 10 stars${rating === starIndex ? ' (current rating)' : ''}`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
      <div
        className="flex justify-center sm:justify-start"
        role={readonly ? "img" : "radiogroup"}
        aria-label={readonly ? `Rating: ${rating} out of 10 stars` : "Rate this item"}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starIndex) => (
          <button
            key={starIndex}
            type="button"
            data-star={starIndex}
            className={`
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 focus:scale-110'}
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1 rounded-sm
              p-0.5 -m-0.5
              ${focusedStar === starIndex ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
            `}
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            onFocus={() => setFocusedStar(starIndex)}
            onBlur={() => setFocusedStar(null)}
            onKeyDown={(e) => handleKeyDown(e, starIndex)}
            disabled={readonly}
            aria-label={getAriaLabel(starIndex)}
            role={readonly ? "presentation" : "radio"}
            aria-checked={!readonly && rating === starIndex}
            tabIndex={readonly ? -1 : (starIndex === 1 || starIndex === rating) ? 0 : -1}
          >
            <svg
              className={`${sizeClasses[size]} ${getStarFill(starIndex)} transition-colors duration-150`}
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {showNumber && (
        <div className="text-center sm:text-left">
          <span className={`${textSizeClasses[size]} font-medium text-gray-700`}>
            {rating > 0 ? `${rating}/10` : 'No rating'}
          </span>
          {!readonly && (
            <p className="text-xs text-gray-500 mt-1 sm:hidden">
              Tap a star to rate
            </p>
          )}
        </div>
      )}
      
      {/* Screen reader instructions */}
      {!readonly && (
        <div className="sr-only" aria-live="polite">
          {hoverRating > 0 && `Hover rating: ${hoverRating} out of 10 stars`}
          {rating > 0 && `Current rating: ${rating} out of 10 stars`}
        </div>
      )}
    </div>
  );
}