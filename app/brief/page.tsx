'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateFieldsFromDescription, GeneratedFieldsResponse } from '@/lib/api';
import { saveProduct, getStoredProducts, deleteProduct, BriefProduct } from '@/lib/storage';

export default function BriefPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'add' | 'enquiries'>('add');
  const [itemInput, setItemInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<BriefProduct[]>([]);

  const handleGenerateWithAI = async () => {
    if (!itemInput.trim()) {
      alert('Please enter an item name');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Create a basic product object from the item input
      const productData = {
        product_name: itemInput.trim(),
        description: `Product: ${itemInput.trim()}`,
      };

      // Call the backend endpoint
      const fields = await generateFieldsFromDescription(productData);
      setGeneratedFields(fields);
      
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

  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  useEffect(() => {
    // Load products from localStorage on mount
    loadProducts();

    // Listen for storage changes (when products are added from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brief_products') {
        loadProducts();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleCustomStorageChange = () => {
      loadProducts();
    };
    
    window.addEventListener('productAdded', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('productAdded', handleCustomStorageChange);
    };
  }, []);

  const handleClearForm = () => {
    setGeneratedFields(null);
    setFormData({});
    setImageUrl('');
    setError(null);
    setItemInput('');
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId);
      loadProducts();
    }
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

      // Create product object for storage
      const briefProduct: BriefProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: itemInput.trim(),
        category: generatedFields?.item || 'General',
        specifications: specifications,
        addedDate: new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        image_link: imageUrl.trim() || '',
      };

      // Save to localStorage
      saveProduct(briefProduct);
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('productAdded'));
      }
      
      // Reload products to show the new one
      loadProducts();
      
      // Reset form
      handleClearForm();
      
      // Show success message
      alert('Product saved successfully!');
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEnquiry = () => {
    // TODO: Implement create enquiry logic
    console.log('Create & Save Enquiry');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Smart Procurement</h1>
              <p className="text-sm text-gray-600">AI-Powered Item Enquiry</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('add')}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'add'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                + Add Products
              </button>
              <button
                onClick={() => setActiveTab('enquiries')}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'enquiries'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Enquiries
              </button>
            </div>
            
            {/* Create & Save Enquiry Button */}
            <button
              onClick={handleCreateEnquiry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
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
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              Create & Save Enquiry
            </button>
          </div>
        </div>

        {/* Item Enquiry Input Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">
              Q What item do you need?
            </h2>
          </div>

          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={itemInput}
              onChange={(e) => setItemInput(e.target.value)}
              placeholder="Enter item name (e.g., Laptop, Office Chair, Smartphone...)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleGenerateWithAI}
              disabled={isLoading || !itemInput.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
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
                  Generating...
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
                    <path d="M12 2L14.09 8.26L20 9.27L15 13.14L16.18 19.02L12 15.77L7.82 19.02L9 13.14L4 9.27L9.91 8.26L12 2Z"></path>
                  </svg>
                  Generate with AI
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-600">
            Our AI will automatically identify the key specifications needed for your item.
          </p>
        </div>

        {/* Generated Fields Form */}
        {generatedFields && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {generatedFields.item}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Fill in the specifications below</p>
              </div>
              <button
                onClick={handleClearForm}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image URL Field - Full Width */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-500">
                  Enter a URL to an image of the product
                </p>
              </div>

              {/* Fields in 3x3 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedFields.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                    </label>
                    {field.type === 'dropdown' && field.options ? (
                      <select
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData[field.label] || ''}
                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                        required
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
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
                    'Save Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Added Products Section */}
        {products.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Added Products ({products.length} item{products.length !== 1 ? 's' : ''})
              </h3>
              <button
                onClick={() => router.push('/product-sheet')}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Product Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Key Specifications
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Added
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {product.image_link ? (
                            <img
                              src={product.image_link}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-gray-400"
                              >
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                            </div>
                          )}
                          <span className="text-sm text-gray-900 font-medium">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                          {product.specifications.slice(0, 3).map((spec, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full"
                            >
                              {spec}
                            </span>
                          ))}
                          {product.specifications.length > 3 && (
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                              +{product.specifications.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {product.addedDate}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                          aria-label="Delete product"
                        >
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
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

