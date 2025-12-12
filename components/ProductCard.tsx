'use client';

import { Product, generateFieldsFromKeyword, GeneratedFieldsResponse } from '@/lib/api';
import { saveProduct, BriefProduct } from '@/lib/storage';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddClick = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Send product document as keyword to generate fields
      const fields = await generateFieldsFromKeyword(JSON.stringify(product));
      setGeneratedFields(fields);
      setIsModalOpen(true);
      // Initialize form data with empty values
      const initialData: Record<string, string | number> = {};
      fields.fields.forEach((field) => {
        initialData[field.label] = field.type === 'number' ? 0 : '';
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

  const handleInputChange = (label: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
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
              {/* Fields in 2x2 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedFields.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    {field.type === 'dropdown' && field.options ? (
                      <select
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                        required
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>

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
                  <span>ADD</span>
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