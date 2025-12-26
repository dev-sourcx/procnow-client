'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getCurrentUser, type CurrentUser, getProductSheet, ProductSheetItem, generateFieldsFromKeyword, type GeneratedFieldsResponse, addProductItem, deleteProductItem, getEnquiries, createEnquiry } from '@/lib/api';
import { getAuthToken, ChatSession } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import CreatableSelect from '@/components/CreatableSelect';
import { useTheme } from '@/contexts/ThemeContext';

interface BriefProduct {
  id: string;
  name: string;
  category: string;
  specifications: string[];
  addedDate: string;
  image_link?: string;
}

export default function ProductSheetPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiKeyword, setAiKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [specFormData, setSpecFormData] = useState<Record<string, string | number | string[]>>({});
  const [isSubmittingSpec, setIsSubmittingSpec] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] = useState<string>('Specifications');
  const [enquiryCount, setEnquiryCount] = useState<number>(0);
  
  // Enquiry sidebar state
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
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [enquiryStatus, setEnquiryStatus] = useState('draft');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Product selection for enquiry
  const [productSheetItems, setProductSheetItems] = useState<ProductSheetItem[]>([]);
  const [productCount, setProductCount] = useState<number>(0);
  const [isNewEnquiryProductModalOpen, setIsNewEnquiryProductModalOpen] = useState(false);
  const [newEnquirySelectedProductIds, setNewEnquirySelectedProductIds] = useState<string[]>([]);
  
  // Generate product modal state
  const [isGenerateProductModalOpen, setIsGenerateProductModalOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState('');
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);
  const [generatedFieldsForEnquiry, setGeneratedFieldsForEnquiry] = useState<GeneratedFieldsResponse | null>(null);
  const [specFormDataForEnquiry, setSpecFormDataForEnquiry] = useState<Record<string, string | number | string[]>>({});

  // Helper function to map ProductSheetItem to BriefProduct format
  const mapProductSheetItemToBriefProduct = (item: ProductSheetItem & { createdAt?: string | Date }, index: number): BriefProduct => {
    // Extract specifications from userAttributes if they exist
    const specifications: string[] = [];
    if (item.userAttributes) {
      Object.entries(item.userAttributes).forEach(([key, value]) => {
        if (value !== '' && value !== 0 && value !== null) {
          if (Array.isArray(value)) {
            specifications.push(`${key}: ${value.join(', ')}`);
          } else {
            specifications.push(`${key}: ${value}`);
          }
        }
      });
    }

    // Use backend createdAt timestamp if available, otherwise use current date
    let addedDate = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    
    if (item.createdAt) {
      try {
        addedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });
      } catch (e) {
        // If date parsing fails, use current date
        console.warn('Failed to parse createdAt date:', e);
      }
    }

    return {
      id: item._id || `item_${index}`,
      name: item.displayName || 'Unnamed Product',
      category: item.category || 'General',
      specifications: specifications,
      addedDate: addedDate,
      image_link: item.userAttributes?.image_link || item.userAttributes?.Image_Attachment || '',
    };
  };

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const token = getAuthToken();
      if (!token) {
        setProducts([]);
        setProductSheetItems([]);
        setProductCount(0);
        setIsLoadingProducts(false);
        return;
      }

      const productSheet = await getProductSheet(token);
      const mappedProducts = productSheet.productSheetItems.map((item, index) => 
        mapProductSheetItemToBriefProduct(item, index)
      );
      setProducts(mappedProducts);
      setProductSheetItems(productSheet.productSheetItems);
      // Use itemCount from backend if available, otherwise use array length
      setProductCount(productSheet.itemCount ?? productSheet.productSheetItems?.length ?? 0);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setProductSheetItems([]);
      setProductCount(0);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadEnquiryCount = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setEnquiryCount(0);
        return;
      }

      const enquiries = await getEnquiries(token);
      setEnquiryCount(enquiries.length);
    } catch (error) {
      console.error('Error loading enquiry count:', error);
      setEnquiryCount(0);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      await deleteProductItem(token, productId);
      
      // Remove from selected products if selected
      setSelectedProductIds(prev => prev.filter(id => id !== productId));
      
      // Reload products
      await loadProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(error.message || 'Failed to delete product. Please try again.');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiKeyword.trim()) {
      alert('Please enter a product keyword');
      return;
    }

    // Require authentication
    if (!requireAuth()) {
      return;
    }

    setIsGenerating(true);
    try {
      // Call backend to generate fields from keyword
      const fields = await generateFieldsFromKeyword(aiKeyword.trim());
      
      // Initialize form data with empty values
      const initialData: Record<string, string | number | string[]> = {};
      fields.fields.forEach((field) => {
        if (field.type === 'dropdown') {
          initialData[field.label] = [];
        } else if (field.type === 'number') {
          initialData[field.label] = 0;
        } else {
          initialData[field.label] = '';
        }
      });
      
      setSpecFormData(initialData);
      setGeneratedFields(fields);
      setIsSpecModalOpen(true);
      setAiKeyword(''); // Clear input after opening modal
    } catch (error) {
      console.error('Error generating fields:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate fields. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSpecInputChange = (label: string, value: string | number | string[]) => {
    setSpecFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleCloseSpecModal = () => {
    setIsSpecModalOpen(false);
    setGeneratedFields(null);
    setSpecFormData({});
  };

  const handleSubmitSpecForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require authentication before submitting
    if (!requireAuth()) {
      return;
    }

    if (isSubmittingSpec) return;

    setIsSubmittingSpec(true);
    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      // Prepare userAttributes from formData
      const userAttributes: Record<string, any> = {};
      Object.entries(specFormData).forEach(([key, value]) => {
        if (value !== '' && value !== 0 && value !== null && (Array.isArray(value) ? value.length > 0 : true)) {
          userAttributes[key] = value;
        }
      });

      // Prepare product item data for backend
      const productItemPayload = {
        productSource: 'user',
        displayName: generatedFields?.item || aiKeyword.trim(),
        category: 'AI Generated',
        userAttributes: userAttributes,
      };

      // Save to backend
      await addProductItem(token, productItemPayload);
      
      // Dispatch custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('productAdded'));
      }
      
      // Reload products to show the new one
      await loadProducts();
      
      // Close modal and reset
      handleCloseSpecModal();
      
      // Show success message
      alert('Product added successfully!');
      
      // Clear AI keyword input
      setAiKeyword('');
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.message && error.message.includes('logged in') || error.message && error.message.includes('authenticated')) {
        requireAuth();
      } else {
        alert(error.message || 'Failed to save product. Please try again.');
      }
    } finally {
      setIsSubmittingSpec(false);
    }
  };

  const openSpecModal = (items: string[], title?: string) => {
    setSpecModalItems(items);
    setSpecModalTitle(title || 'Specifications');
    setIsSpecModalOpen(true);
  };

  useEffect(() => {
    // Load products and enquiry count
    loadProducts();
    loadEnquiryCount();

    // Load current user if authenticated
    const token = getAuthToken();
    if (token) {
      getCurrentUser(token)
        .then(setCurrentUser)
        .catch(() => setCurrentUser(null));
    }

    // Listen for custom events (product added from other components)
    const handleCustomStorageChange = () => {
      loadProducts();
      loadEnquiryCount(); // Reload enquiry count as well
    };
    
    window.addEventListener('productAdded', handleCustomStorageChange);
    window.addEventListener('enquiryUpdated', loadEnquiryCount);

    return () => {
      window.removeEventListener('productAdded', handleCustomStorageChange);
      window.removeEventListener('enquiryUpdated', loadEnquiryCount);
    };
  }, []);

  const handleNewChat = () => {
    router.push('/');
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSessionDelete = async (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  // Enquiry sidebar handlers
  const handleCreateEnquiry = () => {
    if (!requireAuth()) {
      return;
    }
    setIsNewEnquiryModalOpen(true);
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
    setBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '',
      email: '',
    });
    setExpectedDeliveryDate('');
    setEnquiryStatus('draft');
    setEnquiryNotes('');
    // Pre-populate with selected products if any are selected
    setNewEnquirySelectedProductIds(selectedProductIds.length > 0 ? [...selectedProductIds] : []);
  };

  const handleCloseNewEnquiryModal = () => {
    setIsNewEnquiryModalOpen(false);
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
    setBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phone: '',
      email: '',
    });
    setExpectedDeliveryDate('');
    setEnquiryStatus('draft');
    setEnquiryNotes('');
    setNewEnquirySelectedProductIds([]);
  };

  const handleCloseNewEnquiryProductModal = () => {
    setIsNewEnquiryProductModalOpen(false);
  };

  const handleToggleNewEnquiryProductSelection = (productId: string) => {
    setNewEnquirySelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleDoneNewEnquiryProductSelection = () => {
    setIsNewEnquiryProductModalOpen(false);
  };

  const handleCloseGenerateProductModal = () => {
    setIsGenerateProductModalOpen(false);
    setProductKeyword('');
    setGeneratedFieldsForEnquiry(null);
    setSpecFormDataForEnquiry({});
  };

  const handleGenerateProduct = async () => {
    if (!productKeyword.trim()) {
      alert('Please enter a product keyword');
      return;
    }

    setIsGeneratingProduct(true);
    try {
      const fields = await generateFieldsFromKeyword(productKeyword.trim());
      const initialData: Record<string, string | number | string[]> = {};
      fields.fields.forEach((field) => {
        if (field.type === 'dropdown') {
          initialData[field.label] = [];
        } else if (field.type === 'number') {
          initialData[field.label] = 0;
        } else {
          initialData[field.label] = '';
        }
      });
      setSpecFormDataForEnquiry(initialData);
      setGeneratedFieldsForEnquiry(fields);
    } catch (error) {
      console.error('Error generating fields:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate fields. Please try again.');
    } finally {
      setIsGeneratingProduct(false);
    }
  };

  const handleSpecInputChangeForEnquiry = (label: string, value: string | number | string[]) => {
    setSpecFormDataForEnquiry((prev) => ({ ...prev, [label]: value }));
  };

  const handleAddGeneratedProductToEnquiry = async () => {
    if (!generatedFieldsForEnquiry) return;

    if (!requireAuth()) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      requireAuth();
      return;
    }

    try {
      const userAttributes: Record<string, any> = {};
      Object.entries(specFormDataForEnquiry).forEach(([label, value]) => {
        if (value !== '' && value !== 0 && value !== null && value !== undefined) {
          userAttributes[label] = value;
        }
      });

      const newProduct = await addProductItem(token, {
        productSource: 'ai_generated',
        displayName: generatedFieldsForEnquiry.item || productKeyword,
        category: generatedFieldsForEnquiry.item || 'General',
        userAttributes: userAttributes,
        adminProductId: null,
        externalRef: null,
      });

      await loadProducts();

      if (newProduct._id) {
        setNewEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
      }

      handleCloseGenerateProductModal();
      alert('Product generated and added to enquiry successfully!');
    } catch (error: any) {
      console.error('Error adding generated product:', error);
      alert(error.message || 'Failed to add product. Please try again.');
    }
  };

  const handleSaveNewEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requireAuth()) {
      return;
    }
    
    if (!enquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    if (!shippingAddress.addressLine1.trim() || !shippingAddress.city.trim() || 
        !shippingAddress.state.trim() || !shippingAddress.zipCode.trim() || 
        !shippingAddress.country.trim()) {
      alert('Please fill in all required shipping address fields.');
      return;
    }

    if (!billingAddress.addressLine1.trim() || !billingAddress.city.trim() || 
        !billingAddress.state.trim() || !billingAddress.zipCode.trim() || 
        !billingAddress.country.trim()) {
      alert('Please fill in all required billing address fields.');
      return;
    }

    if (!expectedDeliveryDate) {
      alert('Please select an expected delivery date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      await createEnquiry(token, {
        enquiryName: enquiryName.trim(),
        shippingAddress: {
          addressLine1: shippingAddress.addressLine1,
          addressLine2: shippingAddress.addressLine2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone || undefined,
          email: shippingAddress.email || undefined,
        },
        billingAddress: {
          addressLine1: billingAddress.addressLine1,
          addressLine2: billingAddress.addressLine2 || undefined,
          city: billingAddress.city,
          state: billingAddress.state,
          zipCode: billingAddress.zipCode,
          country: billingAddress.country,
          phone: billingAddress.phone || undefined,
          email: billingAddress.email || undefined,
        },
        expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
        enquiryStatus: enquiryStatus,
        enquiryNotes: enquiryNotes || undefined,
        enquiryProducts: newEnquirySelectedProductIds.length > 0 ? newEnquirySelectedProductIds : [],
      });

      await loadEnquiryCount();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('enquiryUpdated'));
      }
      handleCloseNewEnquiryModal();
      alert('Enquiry created successfully!');
    } catch (error: any) {
      console.error('Error creating enquiry:', error);
      alert(error.message || 'Failed to create enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.specifications.some((spec) => spec.toLowerCase().includes(query))
    );
  });

  return (
    <main className="flex h-screen w-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          router.push('/login');
        }}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-gray-700 dark:text-gray-300 font-medium">
            Welcome, {currentUser?.name || 'Client'}
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
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
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
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
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md"
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="w-full">
            {/* Header Section */}
            {/* <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    Welcome, {currentUser?.name || 'Client'}
                  </h1>
                </div>
                <button
                  onClick={handleCreateEnquiry}
                  disabled={selectedProductIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  Create Enquiry {selectedProductIds.length > 0 && `(${selectedProductIds.length} selected)`}
                </button>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Products</h2>
                <p className="text-gray-600 dark:text-gray-400">Manage your products and create enquiries</p>
              </div>
            </div> */}

            {/* AI Generation Section - Separate on Top */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 my-6">
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
                  className="text-teal-600 dark:text-teal-400"
                >
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Products with AI</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={aiKeyword}
                    onChange={(e) => setAiKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleGenerateWithAI();
                      }
                    }}
                    placeholder="Enter product keyword (e.g., Industrial Valve, Steel Pipe)..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
                <button
                  onClick={handleGenerateWithAI}
                  disabled={!aiKeyword.trim() || isGenerating}
                  className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  {isGenerating ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
            </div>

            {/* Main Card with Tabs, Search */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-700 dark:text-gray-300"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Products</h3>
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
                      {productCount} products
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Manage your products and create enquiries</p>
                </div>
                <div className="relative flex items-center gap-3">
                  <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  </div>
                  <button
                  onClick={handleCreateEnquiry}
                  disabled={selectedProductIds.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  Create Enquiry {selectedProductIds.length > 0 && `(${selectedProductIds.length} selected)`}
                </button>
                </div>
              </div>

              {/* Products List or Empty State */}
              {isLoadingProducts ? (
                <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
                  <div className="mb-6">
                    <svg
                      width="80"
                      height="80"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-gray-400"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No products yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
                    Generate products with AI above or discover products
                  </p>
                  <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors shadow-sm"
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
                      <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Discover Products
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(filteredProducts.map(p => p.id));
                                } else {
                                  setSelectedProductIds([]);
                                }
                              }}
                              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                            />
                          </label>
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Product Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Specifications</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProductIds.includes(product.id);
                        
                        // Parse specifications to show as key: value badges (exclude description and price)
                        const specBadges = product.specifications
                          .filter(spec => {
                            const lowerSpec = spec.toLowerCase();
                            return !lowerSpec.includes('description') && 
                                   !lowerSpec.includes('price') && 
                                   !lowerSpec.includes('cost');
                          })
                          .map(spec => {
                            // Handle "key: value" format
                            if (spec.includes(':')) {
                              return spec;
                            }
                            return spec;
                          });

                        return (
                          <tr
                            key={product.id}
                            className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                              isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-4 px-4">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedProductIds(prev => prev.filter(id => id !== product.id));
                                    } else {
                                      setSelectedProductIds(prev => [...prev, product.id]);
                                    }
                                  }}
                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                              </label>
                            </td>

                            {/* Product Name */}
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                            </td>

                            {/* Specifications */}
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {specBadges.slice(0, 3).map((spec, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                                  >
                                    {spec}
                                  </span>
                                ))}
                                {specBadges.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => openSpecModal(specBadges, product.name)}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:text-gray-700"
                                  >
                                    +{specBadges.length - 3} more
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-4 px-4">
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Selection Summary Bar */}
              {selectedProductIds.length > 0 && (
                <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedProductIds.length > 0 && (
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        confirm(
                          `Are you sure you want to remove ${selectedProductIds.length} product${selectedProductIds.length !== 1 ? 's' : ''}?`
                        )
                      ) {
                        try {
                          const token = getAuthToken();
                          if (!token) {
                            requireAuth();
                            return;
                          }
                          
                          // Delete all selected products
                          await Promise.all(
                            selectedProductIds.map(id => deleteProductItem(token, id))
                          );
                          
                          setSelectedProductIds([]);
                          await loadProducts();
                        } catch (error: any) {
                          console.error('Error deleting products:', error);
                          alert(error.message || 'Failed to delete products. Please try again.');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Remove
                  </button>
                  <button
                    onClick={handleCreateEnquiry}
                    disabled={selectedProductIds.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    Create Enquiry {selectedProductIds.length > 0 && `(${selectedProductIds.length})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Modal for AI Generated Products */}
      {isSpecModalOpen && generatedFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Specify Requirements for {generatedFields.item}
              </h2>
              <button
                onClick={handleCloseSpecModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
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
            <form onSubmit={handleSubmitSpecForm} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedFields.fields.map((field, index) => {
                    // Most fields are required except textarea fields that are optional
                    const isRequired = !field.label.toLowerCase().includes('additional') && 
                                      !field.label.toLowerCase().includes('optional') &&
                                      !field.label.toLowerCase().includes('delivery timeline');
                    
                    // Textarea fields should span full width
                    if (field.type === 'textarea') {
                      return (
                        <div key={index} className="md:col-span-2 space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <textarea
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., dedicated graphics card, webcam, specific port types (USB-C), lightweight`}
                            rows={4}
                            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none placeholder:text-gray-400"
                            required={isRequired}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {isRequired && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'dropdown' && field.options ? (
                          <CreatableSelect
                            value={(specFormData[field.label] as string[]) || []}
                            onChange={(value) => handleSpecInputChange(field.label, value)}
                            options={field.options}
                            placeholder={field.placeholder || `Select ${field.label}`}
                            required={isRequired}
                            className="w-full"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={(specFormData[field.label] as number) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, parseFloat(e.target.value) || 0)}
                            placeholder={field.placeholder || `e.g., 50`}
                            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                            required={isRequired}
                          />
                        ) : (
                          <input
                            type="text"
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., within 3-4 weeks`}
                            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                            required={isRequired}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseSpecModal}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSpec}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
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
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  {isSubmittingSpec ? 'Adding...' : 'Add to My Products'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Specifications View Modal */}
      {isSpecModalOpen && !generatedFields && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsSpecModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{specModalTitle}</h3>
              <button
                onClick={() => setIsSpecModalOpen(false)}
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
                onClick={() => setIsSpecModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Enquiry Sidebar */}
      {isNewEnquiryModalOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleCloseNewEnquiryModal}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#40414F] shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-600">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Create new enquiry
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Fill in the details to create a new enquiry
                  </p>
                </div>
                <button
                  onClick={handleCloseNewEnquiryModal}
                  className="p-2 hover:bg-[#4A4B5A] rounded-lg transition-colors text-gray-400 hover:text-white"
                  aria-label="Close sidebar"
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

              {/* Sidebar Body */}
              <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSaveNewEnquiry} className="p-6 space-y-6">
                  {/* Enquiry Details Section */}
                  <div className="space-y-4">
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
                        className="text-gray-300"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <h3 className="text-lg font-semibold text-white">Enquiry Details</h3>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Enquiry Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={enquiryName}
                        onChange={(e) => setEnquiryName(e.target.value)}
                        placeholder="e.g., Office Furniture Order Q1"
                        className="w-full rounded-lg border border-teal-300 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {/* Shipping Address Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-600">
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
                        className="text-gray-300"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <h3 className="text-lg font-semibold text-white">Shipping Address</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
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
                        className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.addressLine2}
                        onChange={(e) =>
                          setShippingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                        }
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
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
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={shippingAddress.phone}
                          onChange={(e) =>
                            setShippingAddress((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="Phone number"
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={shippingAddress.email}
                          onChange={(e) =>
                            setShippingAddress((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="Email address"
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-600">
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
                        className="text-gray-300"
                      >
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                        <line x1="1" y1="10" x2="23" y2="10"></line>
                      </svg>
                      <h3 className="text-lg font-semibold text-white">Billing Address</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address Line 1 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={billingAddress.addressLine1}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                        }
                        placeholder="Street address, P.O. box"
                        required
                        className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={billingAddress.addressLine2}
                        onChange={(e) =>
                          setBillingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                        }
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          City <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingAddress.city}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, city: e.target.value }))
                          }
                          placeholder="City"
                          required
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          State/Province <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingAddress.state}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, state: e.target.value }))
                          }
                          placeholder="State or Province"
                          required
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          ZIP/Postal Code <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingAddress.zipCode}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                          }
                          placeholder="ZIP or Postal Code"
                          required
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={billingAddress.country}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, country: e.target.value }))
                          }
                          placeholder="Country"
                          required
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={billingAddress.phone}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, phone: e.target.value }))
                          }
                          placeholder="Phone number"
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={billingAddress.email}
                          onChange={(e) =>
                            setBillingAddress((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder="Email address"
                          className="w-full px-4 py-2.5 text-white bg-[#343541] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expected Delivery Date Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <label className="block text-sm font-medium text-gray-300">
                        Expected Delivery Date <span className="text-red-400">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-600 bg-[#343541] px-3 py-2 pr-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="dd-mm-yyyy"
                        required
                      />
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                  </div>

                  {/* Products Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-600">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-300"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-white">
                          Products ({newEnquirySelectedProductIds.length})
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewEnquiryProductModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#343541] border border-gray-600 hover:bg-[#4A4B5A] rounded-lg transition-colors"
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
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                          </svg>
                          Select
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsGenerateProductModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 bg-[#343541] border border-gray-600 hover:bg-[#4A4B5A] rounded-lg transition-colors"
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
                            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          Generate
                        </button>
                      </div>
                    </div>

                    {/* Products List or Empty State */}
                    {newEnquirySelectedProductIds.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 flex flex-col items-center justify-center bg-[#343541]/50">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-500 mb-4"
                        >
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <p className="text-gray-400 font-medium mb-1">No products added yet</p>
                        <p className="text-gray-500 text-sm text-center">
                          Use Select or Generate buttons above
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newEnquirySelectedProductIds.map((productId) => {
                          const product = productSheetItems.find((p) => p._id === productId);
                          if (!product) return null;
                          return (
                            <div
                              key={productId}
                              className="flex items-center justify-between p-3 bg-[#343541] rounded-lg border border-gray-600"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {product.displayName || product.category || 'Unnamed Product'}
                                </p>
                                {product.category && (
                                  <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleNewEnquiryProductSelection(productId)}
                                className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-600">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCloseNewEnquiryModal}
                        className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#343541] hover:bg-[#4A4B5A] rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg transition-colors"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Enquiry'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Enquiry Product Selection Modal */}
      {isNewEnquiryProductModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseNewEnquiryProductModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
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
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Select from Product Sheet</h3>
              </div>
              <button
                onClick={handleCloseNewEnquiryProductModal}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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

            {/* Modal Body - Product List */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {productSheetItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products available in your product sheet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productSheetItems.map((product) => {
                    const isSelected = newEnquirySelectedProductIds.includes(product._id || '');
                    return (
                      <div
                        key={product._id}
                        className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {product.displayName || product.category || 'Unnamed Product'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">AI Generated</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleNewEnquiryProductSelection(product._id || '')}
                            className={`ml-3 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {isSelected ? 'Added' : '+ Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDoneNewEnquiryProductSelection}
                className="w-full px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Product with AI Modal */}
      {isGenerateProductModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseGenerateProductModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
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
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Generate Product with AI</h3>
              </div>
              <button
                onClick={handleCloseGenerateProductModal}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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

            {/* Modal Body */}
            <div className="px-4 py-4 flex-1 overflow-y-auto">
              {!generatedFieldsForEnquiry ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter product keyword
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productKeyword}
                      onChange={(e) => setProductKeyword(e.target.value)}
                      placeholder="e.g., laptop, office chair, printer"
                      className="flex-1 px-3 py-2 border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleGenerateProduct();
                        }
                      }}
                      disabled={isGeneratingProduct}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateProduct}
                      disabled={isGeneratingProduct}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      {isGeneratingProduct ? (
                        <svg
                          className="animate-spin"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg>
                      ) : (
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
                          <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter a product type and AI will generate relevant specification fields
                  </p>
                </>
              ) : (
                <div className="bg-gray-100 rounded-lg p-4 space-y-4">
                  {/* Product Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-900">
                      {generatedFieldsForEnquiry.item}
                    </h4>
                    <span className="text-xs text-gray-500">AI Generated</span>
                  </div>

                  {/* Generated Fields */}
                  <div className="space-y-4">
                    {generatedFieldsForEnquiry.fields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.type !== 'textarea' && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'dropdown' && field.options ? (
                          <CreatableSelect
                            value={(specFormDataForEnquiry[field.label] as string[]) || []}
                            onChange={(value) => handleSpecInputChangeForEnquiry(field.label, value)}
                            options={field.options}
                            placeholder={`Select ${field.label.toLowerCase()}`}
                            required
                            className="w-full"
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={(specFormDataForEnquiry[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChangeForEnquiry(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., Specific brand preferences, desired features like touchscreen, backlit keyboard, ideal delivery date.`}
                            rows={4}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y placeholder:text-gray-400"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={(specFormDataForEnquiry[field.label] as number) || ''}
                            onChange={(e) => handleSpecInputChangeForEnquiry(field.label, parseFloat(e.target.value) || 0)}
                            placeholder={field.placeholder || `e.g., 50`}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            value={(specFormDataForEnquiry[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChangeForEnquiry(field.label, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                            required
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200 space-y-2">
              {generatedFieldsForEnquiry ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddGeneratedProductToEnquiry}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors flex items-center justify-center gap-2"
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
                    + Add to Enquiry
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseGenerateProductModal}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseGenerateProductModal}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

