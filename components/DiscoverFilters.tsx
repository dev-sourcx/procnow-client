'use client';

import { useState } from 'react';

interface DiscoverFiltersProps {
  onClose?: () => void;
  categories?: string[];
  storages?: string[];
  minPrice?: number;
  maxPrice?: number;
  onSelectionChange?: (filters: string[]) => void;
}

export default function DiscoverFilters({
  onClose,
  categories,
  storages,
  minPrice,
  maxPrice,
  onSelectionChange,
}: DiscoverFiltersProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    storage: true,
    rating: true,
    availability: true,
  });

  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const toggleFilter = (label: string) => {
    setSelectedFilters((prev) => {
      const exists = prev.includes(label);
      const next = exists ? prev.filter((f) => f !== label) : [...prev, label];
      if (onSelectionChange) {
        onSelectionChange(next);
      }
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const SectionHeader = ({
    title,
    sectionKey,
  }: {
    title: string;
    sectionKey: keyof typeof openSections;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-100"
    >
      <span>{title}</span>
      <svg
        className={`w-4 h-4 text-gray-400 transition-transform ${
          openSections[sectionKey] ? 'rotate-180' : ''
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );

  return (
    <aside className="h-full w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 text-white text-sm font-semibold">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4" />
            </svg>
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Fine-tune product discovery</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
            2 active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white dark:bg-gray-900">
        {/* Category */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          <SectionHeader title="Category" sectionKey="category" />
          {openSections.category && (
            <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              {(categories && categories.length > 0
                ? categories
                : ['Smartphones', 'Laptops', 'Accessories']
              ).map((label) => (
                <label key={label} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                    checked={selectedFilters.includes(label)}
                    onChange={() => toggleFilter(label)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          <SectionHeader title="Price Range" sectionKey="price" />
          {openSections.price && (
            <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              {minPrice !== undefined && maxPrice !== undefined ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Price range based on current results
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Price data will appear here when products are loaded.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Storage */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          <SectionHeader title="Storage" sectionKey="storage" />
          {openSections.storage && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(storages && storages.length > 0
                ? storages
                : ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB']
              ).map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleFilter(label)}
                  className={`px-2.5 py-1 text-xs border rounded-full ${
                    selectedFilters.includes(label)
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/30 dark:text-teal-200'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          <SectionHeader title="Rating" sectionKey="rating" />
          {openSections.rating && (
            <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <label className="flex items-center justify-between">
                <span>4★ &amp; up</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                  Active
                </span>
              </label>
              <label className="flex items-center justify-between">
                <span>3★ &amp; up</span>
                <input type="checkbox" className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
              </label>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
          <SectionHeader title="Availability" sectionKey="availability" />
          {openSections.availability && (
            <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
              <label className="flex items-center justify-between">
                <span>In Stock</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
                  Active
                </span>
              </label>
              <label className="flex items-center justify-between">
                <span>Fast Delivery</span>
                <input type="checkbox" className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear all filters
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-teal-600 text-white hover:bg-teal-700"
        >
          Apply
        </button>
      </div>
    </aside>
  );
}


