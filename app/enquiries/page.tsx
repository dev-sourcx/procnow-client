'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredEnquiries, deleteEnquiry, saveEnquiry, Enquiry, getStoredProducts, BriefProduct, EnquiryProduct } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedEnquiries, setExpandedEnquiries] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedEnquiryForSubmit, setSelectedEnquiryForSubmit] = useState<string | null>(null);
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
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [modalProducts, setModalProducts] = useState<BriefProduct[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [productDeliveryDates, setProductDeliveryDates] = useState<Record<string, string>>({});
  const [productTargetPrices, setProductTargetPrices] = useState<Record<string, number>>({});
  const [enquiryProductsUpdate, setEnquiryProductsUpdate] = useState(0);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] = useState<string>('Specifications');

  const loadEnquiries = () => {
    const storedEnquiries = getStoredEnquiries();
    // Sort by updatedAt descending (most recent first)
    storedEnquiries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setEnquiries(storedEnquiries);
  };

  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  useEffect(() => {
    loadEnquiries();
    loadProducts();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brief_enquiries') {
        loadEnquiries();
      }
      if (e.key === 'brief_products') {
        loadProducts();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events for same-tab updates
    const handleCustomStorageChange = () => {
      loadEnquiries();
      loadProducts();
    };

    window.addEventListener('enquiryUpdated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('enquiryUpdated', handleCustomStorageChange);
    };
  }, []);

  const handleNewChat = () => {
    router.push('/');
  };

  const toggleEnquiry = (enquiryId: string) => {
    setExpandedEnquiries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(enquiryId)) {
        newSet.delete(enquiryId);
      } else {
        newSet.add(enquiryId);
      }
      return newSet;
    });
  };

  const handleDeleteEnquiry = (enquiryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (confirm('Are you sure you want to delete this enquiry?')) {
      deleteEnquiry(enquiryId);
      loadEnquiries();
      setExpandedEnquiries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(enquiryId);
        return newSet;
      });
      setOpenMenuId(null);
    }
  };

  const handleSubmitEnquiry = (enquiryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const enquiry = enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) return;

    const enquiryProducts = enquiry.products || [];
    
    if (enquiryProducts.length === 0) {
      alert('Please add at least one product to the enquiry before submitting.');
      setOpenMenuId(null);
      return;
    }

    // Open the submit modal
    setSelectedEnquiryForSubmit(enquiryId);
    setIsSubmitModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseSubmitModal = () => {
    setIsSubmitModalOpen(false);
    setSelectedEnquiryForSubmit(null);
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
  };

  const handleShippingAddressChange = (field: string, value: string) => {
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitEnquiryForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEnquiryForSubmit) return;

    const enquiry = enquiries.find((e) => e.id === selectedEnquiryForSubmit);
    if (!enquiry) return;

    // Validate required fields
    if (!shippingAddress.addressLine1.trim() || !shippingAddress.city.trim() || 
        !shippingAddress.state.trim() || !shippingAddress.zipCode.trim() || 
        !shippingAddress.country.trim()) {
      alert('Please fill in all required shipping address fields.');
      return;
    }

    // Update the enquiry with shipping address and current timestamp
    const updatedEnquiry: Enquiry = {
      ...enquiry,
      updatedAt: new Date().toISOString(),
      // Store shipping address in the enquiry (you may want to add this to the Enquiry interface)
      shippingAddress: shippingAddress,
    } as Enquiry & { shippingAddress: typeof shippingAddress };

    saveEnquiry(updatedEnquiry);
    loadEnquiries();
    
    // Show success message
    const enquiryProducts = enquiry.products || [];
    alert(`Enquiry "${enquiry.name}" has been submitted successfully with ${enquiryProducts.length} product(s).`);
    
    handleCloseSubmitModal();
  };

  const toggleMenu = (enquiryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === enquiryId ? null : enquiryId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const getProductById = (productId: string): BriefProduct | undefined => {
    return products.find((p) => p.id === productId);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleCreateEnquiry = () => {
    setIsNewEnquiryModalOpen(true);
    setEnquiryName('');
  };

  const handleCloseNewEnquiryModal = () => {
    setIsNewEnquiryModalOpen(false);
    setEnquiryName('');
  };

  const handleSaveNewEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!enquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    const newEnquiry: Enquiry = {
      id: `enquiry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: enquiryName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveEnquiry(newEnquiry);
    loadEnquiries();
    handleCloseNewEnquiryModal();
  };

  const handleOpenProductModal = (enquiryId: string) => {
    setSelectedEnquiryId(enquiryId);
    const allProducts = getStoredProducts();
    setModalProducts(allProducts);
    
    // Load existing enquiry to get already added products
    const enquiries = getStoredEnquiries();
    const enquiry = enquiries.find((e) => e.id === enquiryId);
    
    // Initialize quantities, delivery dates, and target prices
    const initialQuantities: Record<string, number> = {};
    const initialDeliveryDates: Record<string, string> = {};
    const initialTargetPrices: Record<string, number> = {};
    
    allProducts.forEach((product) => {
      // Check if product is already in enquiry
      const existingProduct = enquiry?.products?.find((p) => p.productId === product.id);
      if (existingProduct) {
        initialQuantities[product.id] = existingProduct.quantity;
        initialDeliveryDates[product.id] = existingProduct.deliveryDate;
        initialTargetPrices[product.id] = existingProduct.targetPrice;
      } else {
        initialQuantities[product.id] = 1;
        initialDeliveryDates[product.id] = '';
        initialTargetPrices[product.id] = 0;
      }
    });
    
    setProductQuantities(initialQuantities);
    setProductDeliveryDates(initialDeliveryDates);
    setProductTargetPrices(initialTargetPrices);
    setIsProductModalOpen(true);
    // Trigger animation
    setTimeout(() => setIsDrawerAnimating(true), 10);
  };

  const handleCloseProductModal = () => {
    setIsDrawerAnimating(false);
    // Wait for animation to complete before hiding and resetting state
    setTimeout(() => {
      setIsProductModalOpen(false);
      setSelectedEnquiryId(null);
      setModalProducts([]);
      setProductQuantities({});
      setProductDeliveryDates({});
      setProductTargetPrices({});
    }, 300);
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: newQuantity,
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setModalProducts((prev) => prev.filter((p) => p.id !== productId));
    setProductQuantities((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
    setProductDeliveryDates((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
    setProductTargetPrices((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const handleAddProductToEnquiry = (productId: string) => {
    if (!selectedEnquiryId) return;

    const enquiries = getStoredEnquiries();
    const enquiry = enquiries.find((e) => e.id === selectedEnquiryId);
    
    if (!enquiry) return;

    const enquiryProduct: EnquiryProduct = {
      productId,
      quantity: productQuantities[productId] || 1,
      deliveryDate: productDeliveryDates[productId] || '',
      targetPrice: productTargetPrices[productId] || 0,
    };

    // Update or add the product to the enquiry
    const updatedProducts = enquiry.products || [];
    const existingIndex = updatedProducts.findIndex((p) => p.productId === productId);
    
    if (existingIndex >= 0) {
      updatedProducts[existingIndex] = enquiryProduct;
    } else {
      updatedProducts.push(enquiryProduct);
    }

    const updatedEnquiry: Enquiry = {
      ...enquiry,
      products: updatedProducts,
      updatedAt: new Date().toISOString(),
    };

    saveEnquiry(updatedEnquiry);
    loadEnquiries();
    // Force re-render of drawer to update button states
    setEnquiryProductsUpdate((prev) => prev + 1);
  };

  const isProductAddedToEnquiry = (productId: string): boolean => {
    if (!selectedEnquiryId) return false;
    const enquiries = getStoredEnquiries();
    const enquiry = enquiries.find((e) => e.id === selectedEnquiryId);
    return enquiry?.products?.some((p) => p.productId === productId) || false;
  };

  const getAddedProductsCount = (): number => {
    if (!selectedEnquiryId) return 0;
    const enquiries = getStoredEnquiries();
    const enquiry = enquiries.find((e) => e.id === selectedEnquiryId);
    return enquiry?.products?.length || 0;
  };

  const handleAddAllProductsToEnquiry = () => {
    if (!selectedEnquiryId) return;

    const enquiries = getStoredEnquiries();
    const enquiry = enquiries.find((e) => e.id === selectedEnquiryId);
    
    if (!enquiry) return;

    // Get all products currently in the drawer
    const updatedProducts: EnquiryProduct[] = modalProducts.map((product) => {
      return {
        productId: product.id,
        quantity: productQuantities[product.id] || 1,
        deliveryDate: productDeliveryDates[product.id] || '',
        targetPrice: productTargetPrices[product.id] || 0,
      };
    });

    // Update the enquiry with all products
    const updatedEnquiry: Enquiry = {
      ...enquiry,
      products: updatedProducts,
      updatedAt: new Date().toISOString(),
    };

    saveEnquiry(updatedEnquiry);
    loadEnquiries();
    
    // Show success message
    alert(`Successfully added ${updatedProducts.length} product(s) to "${enquiry.name}".`);
    
    // Close the drawer
    handleCloseProductModal();
  };

  const openSpecModal = (items: string[], title?: string) => {
    setSpecModalItems(items);
    setSpecModalTitle(title || 'Specifications');
    setSpecModalOpen(true);
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

        {/* Content */}
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div className="flex h-12 items-center justify-center border-b border-gray-700 bg-[#343541] px-4">
            <h1 className="text-lg font-semibold text-white">Enquiries</h1>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 py-6">
              {/* Summary and New Enquiry Button */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-300">
                    {enquiries.length} Enquir{enquiries.length !== 1 ? 'ies' : 'y'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage and view all your product enquiries
                  </p>
                </div>
                <button
                  onClick={handleCreateEnquiry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
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
                  New Enquiry
                </button>
              </div>

              {/* Enquiries Accordion */}
              {enquiries.length === 0 ? (
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
                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                      />
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">
                      No enquiries yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Create your first enquiry from the brief page
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
                  {enquiries.map((enquiry) => {
                    const isExpanded = expandedEnquiries.has(enquiry.id);
                    const enquiryProducts = enquiry.products || [];
                    const totalProducts = enquiryProducts.length;

                    return (
                      <div
                        key={enquiry.id}
                        className="bg-[#40414F] rounded-lg border border-gray-700 overflow-hidden"
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleEnquiry(enquiry.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#4A4B5A] transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 text-left">
                            <div className="flex-shrink-0">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              >
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {enquiry.name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>
                                  {totalProducts} product{totalProducts !== 1 ? 's' : ''}
                                </span>
                                <span>•</span>
                                <span>Created {formatDate(enquiry.createdAt)}</span>
                                {enquiry.updatedAt !== enquiry.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>Updated {formatDate(enquiry.updatedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {totalProducts > 0 && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-600/20 text-blue-400 rounded-full">
                                {totalProducts} item{totalProducts !== 1 ? 's' : ''}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductModal(enquiry.id);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
                              aria-label="Add product"
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
                              Add product
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEnquiry(enquiry.id);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-gray-200 bg-[#202123] hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              {isExpanded ? 'Hide products' : 'View products'}
                            </button>
                            {/* 3-dot Menu */}
                            <div className="relative" ref={(el) => { menuRefs.current[enquiry.id] = el; }}>
                              <button
                                onClick={(e) => toggleMenu(enquiry.id, e)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-[#4A4B5A] rounded-lg transition-colors"
                                aria-label="Enquiry options"
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
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="12" cy="5" r="1"></circle>
                                  <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                              </button>
                              
                              {/* Dropdown Menu */}
                              {openMenuId === enquiry.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#40414F] border border-gray-600 rounded-lg shadow-lg z-10 overflow-hidden">
                                  <button
                                    onClick={(e) => handleSubmitEnquiry(enquiry.id, e)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-[#4A4B5A] transition-colors flex items-center gap-2"
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
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Submit Enquiry
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteEnquiry(enquiry.id, e)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
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
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                    Delete Enquiry
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="border-t border-gray-700 p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-medium text-gray-300">
                                Products ({enquiryProducts.length})
                              </h4>
                              <button
                                onClick={() => handleOpenProductModal(enquiry.id)}
                                className="px-3 py-1.5 text-sm font-medium text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors flex items-center gap-1.5"
                                aria-label="Add product"
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
                                Add product
                              </button>
                            </div>
                            {enquiryProducts.length === 0 ? (
                              <div className="text-center py-8 text-gray-400">
                                <p>No products added to this enquiry yet.</p>
                                <button
                                  onClick={() => handleOpenProductModal(enquiry.id)}
                                  className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                  Add Products
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {enquiryProducts.map((enquiryProduct, index) => {
                                  const product = getProductById(enquiryProduct.productId);
                                  if (!product) {
                                    return (
                                      <div
                                        key={index}
                                        className="p-4 bg-[#343541] rounded-lg border border-gray-600 text-gray-400"
                                      >
                                        Product not found (ID: {enquiryProduct.productId})
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={index}
                                      className="flex items-start gap-4 p-4 bg-[#343541] rounded-lg border border-gray-600 hover:bg-[#3A3B45] transition-colors"
                                    >
                                      {/* Product Image */}
                                      <div className="flex-shrink-0">
                                        {product.image_link ? (
                                          <img
                                            src={product.image_link}
                                            alt={product.name}
                                            className="w-20 h-20 object-cover rounded-lg"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                                            }}
                                          />
                                        ) : (
                                          <div className="w-20 h-20 bg-[#202123] rounded-lg flex items-center justify-center">
                                            <svg
                                              width="24"
                                              height="24"
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
                                            <span className="inline-block px-2 py-0.5 bg-[#202123] text-gray-300 text-xs font-medium rounded-full mb-1">
                                              {product.category.toUpperCase()}
                                            </span>
                                            
                                            {/* Product Name */}
                                            <h4 className="text-base font-semibold text-white mt-1 mb-2">
                                              {product.name}
                                            </h4>

                                            {/* Specifications */}
                                            {product.specifications.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                                {product.specifications.slice(0, 3).map((spec, specIndex) => (
                                                  <span
                                                    key={specIndex}
                                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-300 rounded"
                                                  >
                                                    {spec}
                                                  </span>
                                                ))}
                                                {product.specifications.length > 3 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openSpecModal(product.specifications, product.name)}
                                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-400 rounded hover:text-white transition-colors"
                                                  >
                                                    +{product.specifications.length - 3} more
                                                  </button>
                                                )}
                                              </div>
                                            )}

                                            {/* Enquiry-Specific Details */}
                                            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-600">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                                  Quantity
                                                </label>
                                                <p className="text-sm text-white font-medium">
                                                  {enquiryProduct.quantity}
                                                </p>
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                                  Expected Delivery
                                                </label>
                                                <p className="text-sm text-white">
                                                  {enquiryProduct.deliveryDate
                                                    ? formatDate(enquiryProduct.deliveryDate)
                                                    : 'Not set'}
                                                </p>
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1">
                                                  Target Price
                                                </label>
                                                <p className="text-sm text-white font-medium">
                                                  {enquiryProduct.targetPrice > 0
                                                    ? `$${enquiryProduct.targetPrice.toFixed(2)}`
                                                    : 'Not set'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Enquiry Modal with Shipping Address Form */}
      {isSubmitModalOpen && selectedEnquiryForSubmit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseSubmitModal}
        >
          <div 
            className="bg-[#40414F] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                Submit Enquiry
              </h2>
              <button
                onClick={handleCloseSubmitModal}
                className="p-2 hover:bg-[#4A4B5A] rounded-lg transition-colors text-gray-400 hover:text-white"
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
            <form onSubmit={handleSubmitEnquiryForm} className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-4">
                  Please provide the shipping address for this enquiry.
                </p>
              </div>

              <div className="space-y-4">
                {/* Address Line 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address Line 1 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleShippingAddressChange('addressLine1', e.target.value)}
                    placeholder="Street address, P.O. box"
                    required
                    className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleShippingAddressChange('addressLine2', e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleShippingAddressChange('city', e.target.value)}
                      placeholder="City"
                      required
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      State/Province <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleShippingAddressChange('state', e.target.value)}
                      placeholder="State or Province"
                      required
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Zip Code and Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      ZIP/Postal Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleShippingAddressChange('zipCode', e.target.value)}
                      placeholder="ZIP or Postal Code"
                      required
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Country <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => handleShippingAddressChange('country', e.target.value)}
                      placeholder="Country"
                      required
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Phone and Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => handleShippingAddressChange('phone', e.target.value)}
                      placeholder="Phone number"
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={shippingAddress.email}
                      onChange={(e) => handleShippingAddressChange('email', e.target.value)}
                      placeholder="Email address"
                      className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-600">
                <button
                  type="button"
                  onClick={handleCloseSubmitModal}
                  className="px-4 py-2 text-gray-400 bg-[#343541] hover:bg-[#4A4B5A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
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
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Submit Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Drawer */}
      {isProductModalOpen && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
              isDrawerAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleCloseProductModal}
          />
          {/* Drawer */}
          <div 
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-[#444654] shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${
              isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Add Products to Enquiry
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Select products from your product sheet
                </p>
              </div>
              <button
                onClick={handleCloseProductModal}
                className="p-2 hover:bg-[#2d2d2d] rounded-lg transition-colors text-gray-400"
                aria-label="Close drawer"
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

            {/* Drawer Body - Product List */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400 mb-4"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No products available
                  </h3>
                  <p className="text-gray-400 text-center">
                    Add products to your product sheet first
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start gap-4 p-4 border border-gray-700 rounded-lg hover:bg-[#2d2d2d] transition-colors"
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {product.image_link ? (
                          <img
                            src={product.image_link}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-[#202123] rounded-lg flex items-center justify-center">
                            <svg
                              width="24"
                              height="24"
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
                        <div className="flex flex-col gap-3">
                          <div className="flex-1">
                            {/* Category */}
                            <span className="inline-block px-2 py-0.5 bg-[#202123] text-gray-300 text-xs font-medium rounded-full mb-1">
                              {product.category.toUpperCase()}
                            </span>
                            
                            {/* Product Name */}
                            <h3 className="text-base font-semibold text-white mt-1 mb-2">
                              {product.name}
                            </h3>

                            {/* Specifications */}
                            {product.specifications.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {product.specifications.slice(0, 3).map((spec, index) => (
                                  <span
                                    key={index}
                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-300 rounded"
                                  >
                                    {spec}
                                  </span>
                                ))}
                                {product.specifications.length > 3 && (
                                  <span className="text-xs px-2 py-1 bg-[#202123] text-gray-400 rounded">
                                    +{product.specifications.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Added Date */}
                            <p className="text-xs text-gray-400 mt-2">
                              Added {product.addedDate}
                            </p>
                          </div>

                          {/* Expected Delivery Date and Target Price Fields */}
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-700">
                            {/* Expected Delivery Date */}
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-gray-300">
                                Expected Delivery Date
                              </label>
                              <input
                                type="date"
                                value={productDeliveryDates[product.id] || ''}
                                onChange={(e) => {
                                  setProductDeliveryDates((prev) => ({
                                    ...prev,
                                    [product.id]: e.target.value,
                                  }));
                                }}
                                className="w-full px-3 py-1.5 text-sm text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            {/* Target Price */}
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-gray-300">
                                Target Price
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={productTargetPrices[product.id] || ''}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setProductTargetPrices((prev) => ({
                                    ...prev,
                                    [product.id]: value,
                                  }));
                                }}
                                placeholder="0.00"
                                className="w-full px-3 py-1.5 text-sm text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controls, Add Button, and Remove Button */}
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 border border-gray-600 rounded-lg">
                          <button
                            onClick={() => handleQuantityChange(product.id, (productQuantities[product.id] || 1) - 1)}
                            className="px-2 py-1.5 text-gray-400 hover:bg-[#2d2d2d] rounded-l-lg transition-colors"
                            disabled={(productQuantities[product.id] || 1) <= 1}
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
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={productQuantities[product.id] || 1}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              handleQuantityChange(product.id, Math.max(1, value));
                            }}
                            className="w-16 px-2 py-1.5 text-center text-sm text-white bg-[#202123] border-0 focus:outline-none focus:ring-0"
                          />
                          <button
                            onClick={() => handleQuantityChange(product.id, (productQuantities[product.id] || 1) + 1)}
                            className="px-2 py-1.5 text-gray-400 hover:bg-[#2d2d2d] rounded-r-lg transition-colors"
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
                          </button>
                        </div>

                        {/* Add Button */}
                        {isProductAddedToEnquiry(product.id) ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg cursor-not-allowed flex items-center gap-2 text-sm font-medium"
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
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Added
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddProductToEnquiry(product.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
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
                            Add
                          </button>
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveProduct(product.id)}
                          className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
                          aria-label="Remove product"
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {getAddedProductsCount() > 0 ? (
                  <span>{getAddedProductsCount()} product{getAddedProductsCount() !== 1 ? 's' : ''} added</span>
                ) : (
                  <span>No products added yet</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseProductModal}
                  className="px-4 py-2 text-gray-400 bg-[#202123] hover:bg-[#2d2d2d] rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAddAllProductsToEnquiry}
                  disabled={modalProducts.length === 0}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
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
                  Add to Enquiry
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Specifications Modal */}
      {specModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSpecModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{specModalTitle}</h3>
              <button
                onClick={() => setSpecModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-2 text-sm text-gray-800">
                {specModalItems.map((item, idx) => (
                  <li key={idx} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSpecModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Enquiry Modal */}
      {isNewEnquiryModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseNewEnquiryModal}
        >
          <div 
            className="bg-[#40414F] rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <h2 className="text-xl font-semibold text-white">
                New Enquiry
              </h2>
              <button
                onClick={handleCloseNewEnquiryModal}
                className="p-2 hover:bg-[#4A4B5A] rounded-lg transition-colors text-gray-400 hover:text-white"
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
            <form onSubmit={handleSaveNewEnquiry} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enquiry Name
                  </label>
                  <input
                    type="text"
                    value={enquiryName}
                    onChange={(e) => setEnquiryName(e.target.value)}
                    placeholder="Enter enquiry name"
                    className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-600">
                <button
                  type="button"
                  onClick={handleCloseNewEnquiryModal}
                  className="px-4 py-2 text-gray-400 bg-[#343541] hover:bg-[#4A4B5A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Create Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

