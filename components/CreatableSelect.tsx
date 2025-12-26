'use client';

import { useState, useRef, useEffect } from 'react';

interface CreatableSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export default function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search or add option',
  required = false,
  className = '',
  label,
}: CreatableSelectProps) {
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelectOption = (option: string) => {
    const exists = value.includes(option);
    const next = exists ? value.filter((v) => v !== option) : [...value, option];
    onChange(next);
    setSearchValue('');
    setIsOpen(true);
  };

  const handleAddCustomValue = () => {
    if (!searchValue.trim()) return;
    const trimmedValue = searchValue.trim();
    const exists = value.some((v) => v.toLowerCase() === trimmedValue.toLowerCase());
    if (!exists) {
      onChange([...value, trimmedValue]);
    }
    setSearchValue('');
    setIsOpen(false);
  };

  const handleRemoveValue = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Searchable Input */}
      <div className="relative">
        <div className="w-full min-h-[44px] px-3 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-gray-900/10 dark:focus-within:ring-gray-100/10 focus-within:border-gray-300 dark:focus-within:border-gray-500 flex flex-wrap items-center gap-2">
          {value.map((val) => (
            <span
              key={val}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800"
            >
              {val}
              <button
                type="button"
                onClick={() => handleRemoveValue(val)}
                className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                aria-label={`Remove ${val}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchValue.trim()) {
                e.preventDefault();
                handleAddCustomValue();
              }
              if (e.key === 'Escape') {
                setIsOpen(false);
              }
              if (e.key === 'Backspace' && searchValue === '' && value.length) {
                handleRemoveValue(value[value.length - 1]);
              }
            }}
            placeholder={value.length ? '' : placeholder}
            className="flex-1 min-w-[120px] text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
            required={required && value.length === 0}
          />
          {/* Dropdown Arrow */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option, index) => {
                const isSelected = value.includes(option);
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectOption(option)}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <span className="text-gray-900 dark:text-gray-100">{option}</span>
                    {isSelected && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Selected</span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

