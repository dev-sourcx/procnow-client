'use client';

import { useState, useEffect } from 'react';

interface DiscoverFiltersProps {
  onClose?: () => void;
  discoverFilterMeta?: Record<string, string[]>;
  onSelectionChange?: (filters: Record<string, string[]>) => void;
}

export default function DiscoverFilters({
  onClose,
  discoverFilterMeta,
  onSelectionChange,
}: DiscoverFiltersProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    storage: true,
    rating: true,
    availability: true,
  });

  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Clear selected filters when filter meta changes (new chat/session)
  useEffect(() => {
    setSelectedFilters({});
    if (onSelectionChange) {
      onSelectionChange({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverFilterMeta]);

  const toggleFilter = (filterKey: string, value: string) => {
    setSelectedFilters((prev) => {
      const currentValues = prev[filterKey] || [];
      const exists = currentValues.includes(value);
      const nextValues = exists 
        ? currentValues.filter((f) => f !== value) 
        : [...currentValues, value];
      
      const updated = {
        ...prev,
        [filterKey]: nextValues,
      };
      
      if (onSelectionChange) {
        onSelectionChange(updated);
      }
      return updated;
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(selectedFilters).reduce((sum, arr) => sum + arr.length, 0);
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    if (onSelectionChange) {
      onSelectionChange({});
    }
  };

  console.log(discoverFilterMeta);

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
          {getActiveFiltersCount() > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200">
              {getActiveFiltersCount()} active
          </span>
          )}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!discoverFilterMeta || Object.keys(discoverFilterMeta).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No filters available yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Filters will appear here when products are discovered
            </p>
          </div>
        ) : (
          <>
            {/* Categories */}
            {(discoverFilterMeta.categories || discoverFilterMeta.category) && 
             (discoverFilterMeta.categories || discoverFilterMeta.category || []).length > 0 && (
              <div className="space-y-2">
                <SectionHeader title="Categories" sectionKey="category" />
                {openSections.category && (
                  <div className="space-y-1.5 pl-1">
                    {(discoverFilterMeta.categories || discoverFilterMeta.category || []).map((category, index) => {
                      const filterKey = discoverFilterMeta.categories ? 'categories' : 'category';
                      const isSelected = (selectedFilters[filterKey] || []).includes(category);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter(filterKey, category)}
                            className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {category}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Price Range */}
            {(discoverFilterMeta.price || discoverFilterMeta.prices) && 
             (discoverFilterMeta.price || discoverFilterMeta.prices || []).length > 0 && (
              <div className="space-y-2">
                <SectionHeader title="Price Range" sectionKey="price" />
                {openSections.price && (
                  <div className="space-y-1.5 pl-1">
                    {(discoverFilterMeta.price || discoverFilterMeta.prices || []).map((price, index) => {
                      const filterKey = discoverFilterMeta.price ? 'price' : 'prices';
                      const isSelected = (selectedFilters[filterKey] || []).includes(price);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter(filterKey, price)}
                            className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {price}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Storage */}
            {discoverFilterMeta.storage && discoverFilterMeta.storage.length > 0 && (
              <div className="space-y-2">
                <SectionHeader title="Storage" sectionKey="storage" />
                {openSections.storage && (
                  <div className="space-y-1.5 pl-1">
                    {discoverFilterMeta.storage.map((storage, index) => {
                      const isSelected = (selectedFilters.storage || []).includes(storage);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter('storage', storage)}
                            className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {storage}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Rating */}
            {discoverFilterMeta.rating && discoverFilterMeta.rating.length > 0 && (
              <div className="space-y-2">
                <SectionHeader title="Rating" sectionKey="rating" />
                {openSections.rating && (
                  <div className="space-y-1.5 pl-1">
                    {discoverFilterMeta.rating.map((rating, index) => {
                      const isSelected = (selectedFilters.rating || []).includes(rating);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter('rating', rating)}
                            className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {rating}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Availability */}
            {discoverFilterMeta.availability && discoverFilterMeta.availability.length > 0 && (
              <div className="space-y-2">
                <SectionHeader title="Availability" sectionKey="availability" />
                {openSections.availability && (
                  <div className="space-y-1.5 pl-1">
                    {discoverFilterMeta.availability.map((availability, index) => {
                      const isSelected = (selectedFilters.availability || []).includes(availability);
                      return (
                        <label
                          key={index}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFilter('availability', availability)}
                            className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {availability}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Render any other filter keys dynamically */}
            {Object.entries(discoverFilterMeta).map(([key, values]) => {
              // Skip already rendered sections (check both singular and plural)
              const normalizedKey = key.toLowerCase();
              const skipKeys = ['categories', 'category', 'price', 'prices', 'storage', 'storages', 'rating', 'ratings', 'availability'];
              if (skipKeys.includes(normalizedKey)) {
                return null;
              }
              
              if (!Array.isArray(values) || values.length === 0) {
                return null;
              }

              // Use a safe section key
              const sectionKey = normalizedKey as keyof typeof openSections;
              const isOpen = openSections[sectionKey] !== undefined ? openSections[sectionKey] : true;

              return (
                <div key={key} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newKey = sectionKey;
                      setOpenSections((prev) => {
                        const newState = { ...prev };
                        if (newState[newKey] === undefined) {
                          newState[newKey] = true;
                        } else {
                          newState[newKey] = !newState[newKey];
                        }
                        return newState;
                      });
                    }}
                    className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 dark:text-gray-100"
                  >
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
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
                  {isOpen && (
                    <div className="space-y-1.5 pl-1">
                      {values.map((value, index) => {
                        const isSelected = (selectedFilters[key] || []).includes(value);
                        return (
                          <label
                            key={index}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFilter(key, value)}
                              className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 rounded focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {value}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <button
          type="button"
          onClick={clearAllFilters}
          disabled={getActiveFiltersCount() === 0}
          className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear all filters
        </button>
        <button
          type="button"
          onClick={() => {
            // Filters are already applied via onSelectionChange callback
            // This button can be used for additional actions if needed
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-teal-600 text-white hover:bg-teal-700"
        >
          Apply
        </button>
      </div>
    </aside>
  );
}


