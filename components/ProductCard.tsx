'use client';

import { Product, generateFieldsFromKeyword, GeneratedFieldsResponse } from '@/lib/api';
import { saveProduct, BriefProduct } from '@/lib/storage';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CreatableSelect from './CreatableSelect';

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
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{id: string; label: string; type: 'text' | 'number' | 'textarea' | 'dropdown' | 'file'; options?: string[]; value: string | number | File | null}>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'textarea' | 'dropdown' | 'file'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState<string>('');
  const [customValues, setCustomValues] = useState<Record<string, string[]>>({});
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});

  const handleAddClick = async () => {
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
      const initialData: Record<string, string | number | File | null> = {};
      fieldsWithDefaults.fields.forEach((field) => {
        if (field.type === 'file') {
          initialData[field.label] = null;
        } else {
          initialData[field.label] = field.type === 'number' ? 0 : '';
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

  const handleInputChange = (label: string, value: string | number | File | null) => {
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
    const options = newFieldType === 'dropdown' && newFieldOptions.trim()
      ? newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
      : undefined;

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      options,
      value: newFieldType === 'number' ? 0 : newFieldType === 'file' ? null : '',
    };

    setCustomFields((prev) => [...prev, newField]);
    
    setFormData((prev) => ({
      ...prev,
      [newField.label]: newField.value,
    }));

    if (newFieldType === 'dropdown' && options) {
      setCustomValues((prev) => ({ ...prev, [newField.label]: [] }));
      setDropdownSearch((prev) => ({ ...prev, [newField.label]: '' }));
      setDropdownOpen((prev) => ({ ...prev, [newField.label]: false }));
    }

    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Convert formData to specifications array format: ["key: value", ...]
      const specifications = Object.entries(formData)
        .filter(([_, value]) => value !== '' && value !== 0)
        .map(([key, value]) => `${key}: ${value}`);

      // Create product object for brief page
      const briefProduct: BriefProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: product.product_name,
        category: product.product_category || 'General',
        specifications: specifications,
        addedDate: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        image_link: product.image_link || '',
      };

      // Save to localStorage
      saveProduct(briefProduct);
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('productAdded'));
      }
      
      // Close modal
      handleCloseModal();
      
      // Navigate to brief page
      router.push('/brief');
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
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

  return (
    <>
      {/* Modal */}
      {isModalOpen && generatedFields && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {generatedFields.item}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Specification Form</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              {/* Add Custom Field Button */}
              <div className="flex items-center justify-end mb-4">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedFields.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    {field.type === 'dropdown' && field.options ? (
                      <CreatableSelect
                        value={formData[field.label] as string || ''}
                        onChange={(value) => handleInputChange(field.label, value)}
                        options={field.options}
                        placeholder={`Search or add ${field.label.toLowerCase()}`}
                        required
                        className="w-full"
                      />
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={(formData[field.label] as string) || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={(formData[field.label] as number) || ''}
                        onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'file' ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileChange(field.label, file);
                          }}
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-white hover:file:bg-gray-900 file:cursor-pointer"
                        />
                        {formData[field.label] instanceof File && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
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
                              className="ml-auto text-red-600 hover:text-red-700"
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
                    ) : (
                      <input
                        type="text"
                        value={(formData[field.label] as string) || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    )}
                  </div>
                ))}

                {/* Render Custom Fields */}
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(field.id, field.label)}
                        className="p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
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
                    {field.type === 'dropdown' && field.options ? (
                      <CreatableSelect
                        value={formData[field.label] as string || ''}
                        onChange={(value) => handleInputChange(field.label, value)}
                        options={field.options}
                        placeholder={`Search or add ${field.label.toLowerCase()}`}
                        required
                        className="w-full"
                      />
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={(formData[field.label] as string) || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        rows={3}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={(formData[field.label] as number) || ''}
                        onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'file' ? (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileChange(field.label, file);
                          }}
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-800 file:text-white hover:file:bg-gray-900 file:cursor-pointer"
                        />
                        {formData[field.label] instanceof File && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
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
                              className="ml-auto text-red-600 hover:text-red-700"
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
                    ) : (
                      <input
                        type="text"
                        value={(formData[field.label] as string) || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>

            {/* Add Custom Field Modal */}
            {isAddFieldModalOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={() => setIsAddFieldModalOpen(false)}
              >
                <div 
                  className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Add Custom Field</h2>
                    <button
                      onClick={() => setIsAddFieldModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Label
                      </label>
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="Enter field name"
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Field Type
                      </label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as typeof newFieldType)}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="textarea">Textarea</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="file">File</option>
                      </select>
                    </div>

                    {newFieldType === 'dropdown' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={newFieldOptions}
                          onChange={(e) => setNewFieldOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3"
                          className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separate options with commas
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsAddFieldModalOpen(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        disabled={!newFieldLabel.trim()}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
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
      <div className="group relative flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image Container */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
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
          src={product.image_link || '/placeholder-product.jpg'}
          alt={product.product_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col p-4 gap-2">
        {/* Category Tag */}
        <span className="text-xs text-gray-500 font-medium">{category}</span>

        {/* Product Name */}
        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
          {product.product_name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
          {truncatedDescription}
        </p>

        <div className="flex items-center justify-between mt-1">
          {/* Price */}
          <div className="flex items-center gap-2">
            {currentPrice !== undefined ? (
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
            )}
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