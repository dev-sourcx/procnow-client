'use client';

import { Product, generateFieldsFromKeyword, GeneratedFieldsResponse, addProductItem, uploadFile } from '@/lib/api';
import { getAuthToken } from '@/lib/storage';
import { requireAuth } from '@/lib/auth';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreatableSelect from './CreatableSelect';
import Image from 'next/image';
import { showToast } from '@/lib/toast';

interface ProductCardProps {
  product: Product;
  discount?: number;
  originalPrice?: number;
  currentPrice?: number;
  showAddButton?: boolean;
}

export default function ProductCard({
  product,
  discount,
  originalPrice,
  currentPrice,
  showAddButton = true,
}: ProductCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | File | null | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string; label: string; type: 'text' | 'number' | 'textarea' | 'dropdown' | 'file'; options?: string[]; value: string | number | File | null | string[]}>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string[]>>({});
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});

  const handleAddClick = async () => {
    // Require authentication before adding product
    if (!requireAuth()) {
      return;
    }

    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Send product document as keyword to generate fields
      const fields = await generateFieldsFromKeyword(JSON.stringify(product));
      
      // Add default Description and Image Attachment fields
      const defaultFields: GeneratedFieldsResponse['fields'] = [
        {
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter product description...',
        },
        {
          label: 'Image Attachment',
          type: 'file',
          placeholder: 'Upload product image',
        },
      ];
      
      // Combine default fields with generated fields (defaults at bottom)
      const fieldsWithDefaults: GeneratedFieldsResponse = {
        ...fields,
        fields: [...fields.fields, ...defaultFields],
      };
      
      setGeneratedFields(fieldsWithDefaults);
      setIsModalOpen(true);
      // Initialize form data with empty values
      const initialData: Record<string, string | number | File | null | string[]> = {};
      const excludedFields = ['Description', 'Care Instructions', 'Image Attachment'];
      
      fieldsWithDefaults.fields.forEach((field) => {
        if (field.type === 'file') {
          initialData[field.label] = null;
        } else if (field.type === 'textarea') {
          initialData[field.label] = '';
        } else if (excludedFields.includes(field.label)) {
          // Keep single value for excluded fields
          initialData[field.label] = field.type === 'number' ? 0 : '';
        } else {
          // Use array for all other fields to support multiple values
          initialData[field.label] = [];
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error generating fields:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate fields');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setGeneratedFields(null);
    setFormData({});
    setError(null);
  };

  const handleInputChange = (label: string, value: string | number | File | null | string[]) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleFileChange = (label: string, file: File | null) => {
    setFormData((prev) => ({ ...prev, [label]: file }));
  };

  const handleDropdownSearch = (label: string, searchValue: string) => {
    setDropdownSearch((prev) => ({ ...prev, [label]: searchValue }));
    setDropdownOpen((prev) => ({ ...prev, [label]: true }));
  };

  const handleAddCustomValue = (label: string, value: string, options: string[]) => {
    if (!value.trim()) return;
    
    const existsInOptions = options.some(opt => opt.toLowerCase() === value.toLowerCase());
    
    if (!existsInOptions) {
      setCustomValues((prev) => {
        const currentCustom = prev[label] || [];
        if (!currentCustom.some(cv => cv.toLowerCase() === value.toLowerCase())) {
          return { ...prev, [label]: [...currentCustom, value] };
        }
        return prev;
      });
    }
    
    setFormData((prev) => ({ ...prev, [label]: value }));
    setDropdownSearch((prev) => ({ ...prev, [label]: '' }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const handleSelectOption = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
    setDropdownSearch((prev) => ({ ...prev, [label]: '' }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;

    const fieldId = `custom_${Date.now()}`;

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: 'text' as const,
      value: [] as string[],
    };

    setCustomFields((prev) => [...prev, newField]);
    
    setFormData((prev) => ({
      ...prev,
      [newField.label]: newField.value,
    }));

    setNewFieldLabel('');
    setIsAddFieldModalOpen(false);
  };

  const handleDeleteCustomField = (fieldId: string, fieldLabel: string) => {
    setCustomFields((prev) => prev.filter(field => field.id !== fieldId));
    setFormData((prev) => {
      const updated = { ...prev };
      delete updated[fieldLabel];
      return updated;
    });
    setCustomValues((prev) => {
      const updated = { ...prev };
      delete updated[fieldLabel];
      return updated;
    });
    setDropdownSearch((prev) => {
      const updated = { ...prev };
      delete updated[fieldLabel];
      return updated;
    });
    setDropdownOpen((prev) => {
      const updated = { ...prev };
      delete updated[fieldLabel];
      return updated;
    });
  };

  // Validate if a string is valid base64
  function isValidBase64(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    
    // Remove data:image/... prefix if present
    const base64Data = str.includes(',') ? str.split(',')[1] : str;
    
    // Base64 regex: only allows A-Z, a-z, 0-9, +, /, and = (with padding)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    
    // Check if it matches base64 pattern and has reasonable length
    return base64Regex.test(base64Data.trim()) && base64Data.trim().length > 0;
  }

  // Data URI placeholder for a simple gray square
  const placeholderDataUri = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Qcm9kdWN0IEltYWdlPC90ZXh0Pjwvc3ZnPg==';

  // Reset error state when product changes
  useEffect(() => {
    setImageError(false);
  }, [product.image, product.image_link]);

  // Memoize the image URL to prevent repeated calls
  const imageUrl = useMemo(() => {
    // If image error occurred, use placeholder
    if (imageError) {
      return placeholderDataUri;
    }
    
    if (!product.image) {
      return product.image_link || placeholderDataUri;
    }
    
    // Check if it's already a URL
    if (product.image.startsWith('http://') || product.image.startsWith('https://') || product.image.startsWith('/')) {
      return product.image;
    }
    
    // Validate base64 before attempting to decode
    if (!isValidBase64(product.image)) {
      console.warn('Invalid base64 string, falling back to image_link');
      return product.image_link || placeholderDataUri;
    }
    
    try {
      let base64Data: string;
      let mime = 'image/webp';
      
      if (product.image.includes(',')) {
        // Handle data:image/... format
        const [meta, data] = product.image.split(",");
        if (!data) return product.image_link || placeholderDataUri;
        
        mime = meta.match(/:(.*?);/)?.[1] || "image/webp";
        base64Data = data.trim();
      } else {
        // Raw base64 data
        base64Data = product.image.trim();
      }
      
      // Clean the base64 data
      const cleanData = base64Data.replace(/\\x3d/g, "=").replace(/\\/g, "").trim();
      
      // Final validation before atob
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanData)) {
        return product.image_link || placeholderDataUri;
      }
      
      const bytes = atob(cleanData);
      const array = new Uint8Array(bytes.length);
      
      for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
      }
      
      const blob = new Blob([array], { type: mime });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error converting base64 to blob URL:', error);
      return product.image_link || placeholderDataUri;
    }
  }, [product.image, product.image_link, imageError, placeholderDataUri]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require authentication before submitting
    if (!requireAuth()) {
      return;
    }
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Convert formData to specifications array format: ["key: value", ...]
      const specifications = Object.entries(formData)
        .filter(([_, value]) => {
          if (Array.isArray(value)) return value.length > 0;
          return value !== '' && value !== 0 && value !== null;
        })
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`;
          }
          return `${key}: ${value}`;
        });

      // Get auth token
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      // Upload files to S3 and replace File objects with S3 URLs
      const userAttributes: Record<string, any> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '' && value !== 0 && value !== null && (Array.isArray(value) ? value.length > 0 : true)) {
          // If value is a File, upload it to S3
          if (value instanceof File) {
            try {
              const uploadResult = await uploadFile(token, value, 'buyer-attachments');
              userAttributes[key] = uploadResult.url;
            } catch (uploadError: any) {
              console.error(`Error uploading file ${key}:`, uploadError);
              setError(`Failed to upload ${key}. Please try again.`);
              showToast({ type: 'error', message: `Failed to upload ${key}. Please try again.` });
              setIsSubmitting(false);
              return;
            }
          } else {
            userAttributes[key] = value;
          }
        }
      }

      // Prepare product item data for backend
      const productItemPayload = {
        productSource: 'user', // or 'admin' if from admin products
        displayName: product.product_name,
        category: product.product_category || 'General',
        externalRef: product._id || null, // Reference to original product
        userAttributes: userAttributes,
      };

      // Save to backend
      await addProductItem(token, productItemPayload);
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('productAdded'));
      }
      
      // Show success toast
      showToast({ type: 'success', message: 'Product saved successfully!' });

      // Close modal
      handleCloseModal();
      
      // Navigate to brief page
      // router.push('/');
    } catch (error: any) {
      console.error('Error saving product:', error);
      // Show user-friendly error message
      if (error.message && error.message.includes('logged in')) {
        setError('You must be logged in to save products. Please log in and try again.');
        showToast({ type: 'error', message: 'You must be logged in to save products. Please log in and try again.' });
      } else {
        setError('Failed to save product. Please try again.');
        showToast({ type: 'error', message: 'Failed to save product. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format category to uppercase
  const category = product.product_category?.toUpperCase() || 'PRODUCT';

  // Truncate description
  const truncatedDescription =
    product.description && product.description.length > 80
      ? `${product.description.substring(0, 80)}...`
      : product.description;

  const inputBaseClasses =
    'w-full h-11 px-3 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500';
  const textareaClasses =
    'w-full px-3 py-2.5 min-h-[110px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500';
  const fileInputClasses =
    'w-full h-11 px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 file:mr-3 file:h-full file:px-3 file:py-0 file:rounded-md file:border file:border-gray-300 dark:file:border-gray-600 file:bg-white dark:file:bg-gray-700 file:text-gray-800 dark:file:text-gray-100 file:text-sm file:font-medium file:leading-normal hover:file:bg-gray-50 dark:hover:file:bg-gray-600 file:cursor-pointer';

  return (
    <>
      {/* Modal */}
      {isModalOpen && generatedFields && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {generatedFields.item}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Specification Form</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close modal"
              >
                <svg
                  width="24"
                  height="24"
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
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                  </div>
                )}
                {/* Add Custom Field Button */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Specification Form</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Add details or create your own fields</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddFieldModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
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
                    Add Custom Field
                  </button>
                </div>
                {/* Fields in 2x2 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {generatedFields.fields.map((field, index) => {
                    const excludedFields = ['Description', 'Care Instructions', 'Image Attachment'];
                    const shouldAllowMultiple = !excludedFields.includes(field.label);
                    
                    const inputId = `field-${index}-${field.label}`;
                    return (
                      <div key={index} className="space-y-2">
                        <label 
                          htmlFor={inputId}
                          className="block text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
                        >
                          {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            id={inputId}
                            value={(formData[field.label] as string) || ''}
                            onChange={(e) => handleInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className={textareaClasses}
                            required
                          />
                        ) : field.type === 'file' ? (
                          <div className="space-y-2">
                            <label htmlFor={inputId} className="cursor-pointer">
                              <input
                                id={inputId}
                                type="file"
                                accept="application/pdf, image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  handleFileChange(field.label, file);
                                }}
                                className={fileInputClasses}
                              />
                            </label>
                            {formData[field.label] instanceof File && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
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
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <span>{formData[field.label] instanceof File ? (formData[field.label] as File).name : ''}</span>
                                <button
                                  type="button"
                                  onClick={() => handleFileChange(field.label, null)}
                                  className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  <svg
                                    width="14"
                                    height="14"
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
                              </div>
                            )}
                          </div>
                        ) : shouldAllowMultiple ? (
                          <div 
                            onClick={(e) => {
                              // Find the input inside CreatableSelect and focus it
                              const input = (e.currentTarget as HTMLElement).querySelector('input');
                              if (input) {
                                input.focus();
                              }
                            }} 
                            className="cursor-pointer"
                          >
                            <CreatableSelect
                              value={(formData[field.label] as string[]) || []}
                              onChange={(value) => handleInputChange(field.label, value)}
                              options={field.options || []}
                              placeholder={`Search or add ${field.label.toLowerCase()}`}
                              required
                              className="w-full"
                            />
                          </div>
                        ) : (
                          <input
                            id={inputId}
                            type="text"
                            value={(formData[field.label] as string) || ''}
                            onChange={(e) => handleInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder}
                            className={inputBaseClasses}
                            required
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Render Custom Fields */}
                  {customFields.map((field) => {
                    return (
                      <div key={field.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label 
                            className="block text-sm font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
                          >
                            {field.label}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomField(field.id, field.label)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                            aria-label="Delete field"
                          >
                            <svg
                              width="14"
                              height="14"
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
                        </div>
                        {/* Custom fields are always text type and should support multiple values */}
                        <div 
                          onClick={(e) => {
                            // Find the input inside CreatableSelect and focus it
                            const input = (e.currentTarget as HTMLElement).querySelector('input');
                            if (input) {
                              input.focus();
                            }
                          }} 
                          className="cursor-pointer"
                        >
                          <CreatableSelect
                            value={(formData[field.label] as string[]) || []}
                            onChange={(value) => handleInputChange(field.label, value)}
                            options={[]}
                            placeholder={`Search or add ${field.label.toLowerCase()}`}
                            required
                            className="w-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Add Custom Field Modal */}
            {isAddFieldModalOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={() => setIsAddFieldModalOpen(false)}
              >
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Custom Field</h2>
                    <button
                      onClick={() => setIsAddFieldModalOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg
                        width="24"
                        height="24"
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
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="Enter field name"
                        className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-200 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={() => setIsAddFieldModalOpen(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        disabled={!newFieldLabel.trim()}
                        className="px-6 py-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 disabled:bg-gray-600 dark:disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Card */}
      <div className="group relative flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full max-w-xs">
      {/* Image Container */}
      <div className="relative w-full h-40 overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* Discount Badge */}
        {discount && discount > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded">
            -{discount}%
          </div>
        )}

        {/* Favorite Icon */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-3 right-3 z-10 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
          aria-label="Add to favorites"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#ef4444' : 'none'}
            stroke={isFavorite ? '#ef4444' : '#374151'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>

        {/* Product Image */}
        <img
          src={product.image}
          alt={product.item || product.product_name || 'Product image'}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Only set error state if we haven't already, and if it's not already the placeholder
            if (!imageError && !target.src.includes('data:image/svg+xml')) {
              setImageError(true);
            }
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col p-4 gap-2">
        {/* Category Tag */}
        {/* <span className="text-xs text-gray-500 font-medium">{category}</span> */}

        {/* Product Name */}
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
          {product.item}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
          {truncatedDescription}
        </p>

        <div className="flex items-center justify-between mt-1">
          {/* Price */}
          <div className="flex items-center gap-2">
            {/* {currentPrice !== undefined ? (
              <>
                <span className="text-lg font-semibold text-gray-900">
                  ${currentPrice.toFixed(2)}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-500">Price on request</span>
            )} */}
          </div>

          {/* Add Button */}
          {showAddButton && (
            <button
              onClick={handleAddClick}
              disabled={isLoading}
              className="mt-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
                  <span>Add to list</span>
                </>
              )}
          </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
