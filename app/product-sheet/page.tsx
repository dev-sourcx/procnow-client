'use client';

import { useState, useEffect } from 'react';
import {
  getStoredProducts,
  deleteProduct,
  BriefProduct,
  saveEnquiry,
  Enquiry,
  EnquiryProduct,
} from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function ProductSheetPage() {
  const router = useRouter();
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isNewEnquiryModalOpen, setIsNewEnquiryModalOpen] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  const [shippingAddress, setShippingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
  });

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

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const openNewEnquiryModal = () => {
    if (selectedProductIds.length === 0) {
      alert('Please add at least one product to create an enquiry.');
      return;
    }

    setEnquiryName('');
    setShippingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '',
      email: '',
    });
    setIsNewEnquiryModalOpen(true);
  };

  const handleCreateEnquiryFromSelected = (e: React.FormEvent) => {
    e.preventDefault();

    if (!enquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    const productsForEnquiry: EnquiryProduct[] = selectedProductIds.map(
      (productId) => ({
        productId,
        quantity: 1,
        deliveryDate: '',
        targetPrice: 0,
      })
    );

    const newEnquiry: Enquiry = {
      id: `enquiry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: enquiryName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      products: productsForEnquiry,
      shippingAddress: shippingAddress,
    };

    saveEnquiry(newEnquiry);

    // Notify other tabs/pages
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('enquiryUpdated'));
    }

    // Clear selection and navigate to enquiries page
    setSelectedProductIds([]);
    setIsNewEnquiryModalOpen(false);
    setEnquiryName('');
    router.push('/enquiries');
  };

  return (
    <main className="flex h-screen w-full bg-[#343541]">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={null}
        onLogout={() => {}}
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
                {selectedProductIds.length > 0 && (
                  <p className="text-xs text-blue-300 mt-1">
                    {selectedProductIds.length} product
                    {selectedProductIds.length !== 1 ? 's' : ''} added for new
                    enquiry
                  </p>
                )}
              </div>
              {products.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openNewEnquiryModal}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={selectedProductIds.length === 0}
                  >
                    New enquiry
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all products?')) {
                        products.forEach((p) => deleteProduct(p.id));
                        setSelectedProductIds([]);
                        loadProducts();
                      }
                    }}
                    className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
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
              <div className="space-y-3">
                {products.map((product) => {
                  const isSelected = selectedProductIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-[#3A3B45] border-blue-500 shadow-[0_0_0_1px_rgba(37,99,235,0.5)]'
                          : 'bg-[#40414F] border-gray-700 hover:bg-[#4A4B5A]'
                      }`}
                    >
                      {/* Select checkbox */}
                      <div className="flex-shrink-0">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs transition-colors ${
                              isSelected
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-gray-500 bg-[#202123] text-transparent group-hover:border-blue-500'
                            }`}
                          >
                            ✓
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.id)}
                            className="sr-only"
                          />
                        </label>
                      </div>

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

                          <div className="flex flex-col items-end gap-2">
                            {isSelected && (
                              <span className="inline-flex items-center rounded-full bg-blue-600/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-300">
                                Selected
                              </span>
                            )}
                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to remove "${product.name}"?`
                                  )
                                ) {
                                  deleteProduct(product.id);
                                  setSelectedProductIds((prev) =>
                                    prev.filter((id) => id !== product.id)
                                  );
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
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* New Enquiry Modal */}
        {isNewEnquiryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-[#40414F] border border-gray-700 p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-2">
                Create new enquiry
              </h2>
              <p className="text-sm text-gray-300 mb-4">
                You are creating an enquiry with{' '}
                <span className="font-semibold">
                  {selectedProductIds.length} product
                  {selectedProductIds.length !== 1 ? 's' : ''}
                </span>
                .
              </p>
              <form onSubmit={handleCreateEnquiryFromSelected} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Enquiry name
                  </label>
                  <input
                    type="text"
                    value={enquiryName}
                    onChange={(e) => setEnquiryName(e.target.value)}
                    className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Enter enquiry name"
                    autoFocus
                    required
                  />
                </div>

                {/* Shipping Address (same structure as submit enquiry form) */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Address Line 1 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine1}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                      }
                      placeholder="Street address, P.O. box"
                      required
                      className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine2}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                      }
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        City <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="City"
                        required
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        State/Province <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.state}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="State or Province"
                        required
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        ZIP/Postal Code <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.zipCode}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                        }
                        placeholder="ZIP or Postal Code"
                        required
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Country <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, country: e.target.value }))
                        }
                        placeholder="Country"
                        required
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="Phone number"
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={shippingAddress.email}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, email: e.target.value }))
                        }
                        placeholder="Email address"
                        className="w-full rounded-md border border-gray-600 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewEnquiryModalOpen(false);
                      setEnquiryName('');
                    }}
                    className="px-4 py-2 text-sm text-gray-200 bg-[#202123] hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Create enquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

