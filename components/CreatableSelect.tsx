'use client';

import { useState, useRef, useEffect } from 'react';

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
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
  const [customValues, setCustomValues] = useState<string[]>([]);
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
    onChange(option);
    setSearchValue('');
    setIsOpen(false);
  };

  const handleAddCustomValue = () => {
    if (!searchValue.trim()) return;

    const trimmedValue = searchValue.trim();
    const existsInOptions = options.some(opt => opt.toLowerCase() === trimmedValue.toLowerCase());
    const existsInCustom = customValues.some(cv => cv.toLowerCase() === trimmedValue.toLowerCase());

    if (!existsInOptions && !existsInCustom) {
      setCustomValues((prev) => [...prev, trimmedValue]);
    }

    handleSelectOption(trimmedValue);
  };

  const handleRemoveValue = () => {
    onChange('');
    setSearchValue('');
  };

  const filteredOptions = [...options, ...customValues].filter(opt =>
    opt.toLowerCase().includes(searchValue.toLowerCase())
  );

  const showAddOption = searchValue.trim() && 
    !filteredOptions.some(opt => opt.toLowerCase() === searchValue.toLowerCase().trim());

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Value Badge */}
      {value && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 bg-blue-600/30 text-blue-400 text-sm rounded-lg flex items-center gap-2">
            {value}
            {customValues.includes(value) && (
              <span className="px-1.5 py-0.5 bg-blue-600/50 text-blue-300 text-xs rounded">
                Custom
              </span>
            )}
            <button
              type="button"
              onClick={handleRemoveValue}
              className="ml-1 hover:bg-blue-600/50 rounded p-0.5"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </span>
        </div>
      )}

      {/* Searchable Input */}
      <div className="relative">
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
          }}
          placeholder={value ? `Search or add another option` : placeholder}
          className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
          required={required && !value}
        />
        
        {/* Dropdown Arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-[#202123] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <>
              {filteredOptions.map((option, index) => {
                const isCustom = customValues.includes(option);
                const isSelected = value === option;
                return (
                  <div
                    key={index}
                    onClick={() => handleSelectOption(option)}
                    className={`px-3 py-2 cursor-pointer hover:bg-[#2d2d2d] flex items-center justify-between ${
                      isSelected ? 'bg-blue-600/20' : ''
                    }`}
                  >
                    <span className="text-white">{option}</span>
                    {isCustom && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-2 text-gray-400 text-sm">
              No options found
            </div>
          )}

          {/* Add Custom Value Option */}
          {showAddOption && (
            <div
              onClick={handleAddCustomValue}
              className="px-3 py-2 cursor-pointer hover:bg-[#2d2d2d] border-t border-gray-700 flex items-center gap-2 text-blue-400"
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
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add "{searchValue.trim()}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

