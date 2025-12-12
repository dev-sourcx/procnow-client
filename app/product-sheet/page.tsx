'use client';

import { useState, useEffect } from 'react';
import { getStoredProducts, deleteProduct, BriefProduct } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function ProductSheetPage() {
  const router = useRouter();
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleNewChat = () => {
    // Navigate to home/chat page
    router.push('/');
  };

  return (
    <main className="flex h-screen w-full bg-[#343541]">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#202123] text-white rounded-lg hover:bg-gray-800"
          aria-label="Toggle sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* Content - matches ChatContainer structure exactly */}
        <div className="flex h-full w-full flex-col">
          {/* Header - same as ChatContainer */}
          <div className="flex h-12 items-center justify-center border-b border-gray-700 bg-[#343541] px-4">
            <h1 className="text-lg font-semibold text-white">Product Sheet</h1>
          </div>

          {/* Scrollable Content - same structure as ChatContainer messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Summary */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-300">
                  {products.length} Product{products.length !== 1 ? 's' : ''}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Total products in your sheet
                </p>
              </div>
              {products.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all products?')) {
                      products.forEach((p) => deleteProduct(p.id));
                      loadProducts();
                    }
                  }}
                  className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="flex h-full items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    No products yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Start by adding products from the chat or brief page
                  </p>
                  <button
                    onClick={() => router.push('/brief')}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Go to Brief Page
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 bg-[#40414F] rounded-lg border border-gray-700 hover:bg-[#4A4B5A] transition-colors"
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.image_link ? (
                        <img
                          src={product.image_link}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-500"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Category */}
                          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                            {product.category}
                          </span>
                          
                          {/* Product Name */}
                          <h3 className="text-lg font-semibold text-gray-200 mt-1 mb-2">
                            {product.name}
                          </h3>

                          {/* Specifications */}
                          {product.specifications.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {product.specifications.slice(0, 4).map((spec, index) => (
                                <span
                                  key={index}
                                  className="text-xs px-2 py-1 bg-[#343541] text-gray-300 rounded"
                                >
                                  {spec}
                                </span>
                              ))}
                              {product.specifications.length > 4 && (
                                <span className="text-xs px-2 py-1 bg-[#343541] text-gray-400 rounded">
                                  +{product.specifications.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Added Date */}
                          <p className="text-xs text-gray-500 mt-2">
                            Added {new Date(product.addedDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove "${product.name}"?`)) {
                              deleteProduct(product.id);
                              loadProducts();
                            }
                          }}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          aria-label="Delete product"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

