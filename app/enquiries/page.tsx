'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredProducts, BriefProduct, ChatSession } from '@/lib/storage';
import { requireAuth } from '@/lib/auth';
import { getAuthToken } from '@/lib/storage';
import { getCurrentUser, type CurrentUser, getProductSheet, ProductSheetItem, getEnquiries, createEnquiry, updateEnquiry, deleteEnquiry, type Enquiry as ApiEnquiry, generateFieldsFromKeyword, type GeneratedFieldsResponse, type GeneratedField, addProductItem } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import CreatableSelect from '@/components/CreatableSelect';

interface EnquiryProduct {
  productId: string;
  quantity: number;
  deliveryDate: string;
  targetPrice: number;
}

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<ApiEnquiry[]>([]);
  const [productSheetItems, setProductSheetItems] = useState<ProductSheetItem[]>([]);
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
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [modalProducts, setModalProducts] = useState<ProductSheetItem[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isNewEnquiryProductModalOpen, setIsNewEnquiryProductModalOpen] = useState(false);
  const [newEnquirySelectedProductIds, setNewEnquirySelectedProductIds] = useState<string[]>([]);
  const [enquiryProductsUpdate, setEnquiryProductsUpdate] = useState(0);
  const [isGenerateProductModalOpen, setIsGenerateProductModalOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState('');
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [specFormData, setSpecFormData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] = useState<string>('Specifications');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadEnquiries = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setEnquiries([]);
        setIsLoading(false);
        return;
      }

      const fetchedEnquiries = await getEnquiries(token);
    // Sort by updatedAt descending (most recent first)
      fetchedEnquiries.sort((a, b) => {
        const dateA = new Date(b.updatedAt || b.createdAt || '').getTime();
        const dateB = new Date(a.updatedAt || a.createdAt || '').getTime();
        return dateA - dateB;
      });
      setEnquiries(fetchedEnquiries);
    } catch (error) {
      console.error('Error loading enquiries:', error);
      setEnquiries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setProductSheetItems([]);
        return;
      }

      const productSheet = await getProductSheet(token);
      setProductSheetItems(productSheet.productSheetItems);
    } catch (error) {
      console.error('Error loading products:', error);
      setProductSheetItems([]);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      // Check authentication
      const token = getAuthToken();
      if (token) {
        try {
          const user = await getCurrentUser(token);
          setCurrentUser(user);
        } catch {
          setCurrentUser(null);
        }
      }

      // Load data
      await Promise.all([loadEnquiries(), loadProducts()]);
    };

    initialize();
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

  const handleDeleteEnquiry = async (enquiryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!confirm('Are you sure you want to delete this enquiry?')) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      await deleteEnquiry(token, enquiryId);
      await loadEnquiries();
      setExpandedEnquiries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(enquiryId);
        return newSet;
      });
      setOpenMenuId(null);
    } catch (error: any) {
      console.error('Error deleting enquiry:', error);
      alert(error.message || 'Failed to delete enquiry. Please try again.');
    }
  };

  const handleSubmitEnquiry = (enquiryId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // Require authentication before submitting enquiry
    if (!requireAuth()) {
      return;
    }

    const enquiry = enquiries.find((e) => e._id === enquiryId);
    if (!enquiry) return;

    const enquiryProducts = enquiry.enquiryProducts || [];
    
    if (enquiryProducts.length === 0) {
      alert('Please add at least one product to the enquiry before submitting.');
      setOpenMenuId(null);
      return;
    }

    // Pre-fill shipping address from enquiry if it already exists, so user can review/edit
    if (enquiry.shippingAddress) {
      const addr = enquiry.shippingAddress;
      // If shippingAddress is a string, try to parse it, otherwise use it directly
      if (typeof addr === 'string') {
        try {
          const parsed = JSON.parse(addr);
      setShippingAddress({
            addressLine1: parsed.addressLine1 || '',
            addressLine2: parsed.addressLine2 || '',
            city: parsed.city || '',
            state: parsed.state || '',
            zipCode: parsed.zipCode || '',
            country: parsed.country || '',
            phone: parsed.phone || '',
            email: parsed.email || '',
          });
        } catch {
          // If parsing fails, split by newline or comma
          setShippingAddress({
            addressLine1: addr || '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            phone: '',
            email: '',
          });
        }
      } else {
        setShippingAddress({
          addressLine1: (addr as any).addressLine1 || '',
          addressLine2: (addr as any).addressLine2 || '',
          city: (addr as any).city || '',
          state: (addr as any).state || '',
          zipCode: (addr as any).zipCode || '',
          country: (addr as any).country || '',
          phone: (addr as any).phone || '',
          email: (addr as any).email || '',
      });
      }
    } else {
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
    }

    // Pre-fill billing address if it exists
    if (enquiry.billingAddress) {
      const addr = enquiry.billingAddress;
      if (typeof addr === 'string') {
        try {
          const parsed = JSON.parse(addr);
          setBillingAddress({
            addressLine1: parsed.addressLine1 || '',
            addressLine2: parsed.addressLine2 || '',
            city: parsed.city || '',
            state: parsed.state || '',
            zipCode: parsed.zipCode || '',
            country: parsed.country || '',
            phone: parsed.phone || '',
            email: parsed.email || '',
          });
        } catch {
          setBillingAddress({
            addressLine1: addr || '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            phone: '',
            email: '',
          });
        }
      }
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
  };

  const handleShippingAddressChange = (field: string, value: string) => {
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitEnquiryForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require authentication before submitting enquiry
    if (!requireAuth()) {
      return;
    }

    if (!selectedEnquiryForSubmit) return;
    if (isSubmitting) return;

    const enquiry = enquiries.find((e) => e._id === selectedEnquiryForSubmit);
    if (!enquiry) return;

    // Validate required fields
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

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      // Update the enquiry with shipping/billing address and status
      await updateEnquiry(token, selectedEnquiryForSubmit, {
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
        enquiryStatus: 'submitted',
      });

      await loadEnquiries();
    
    // Show success message
      const enquiryProducts = enquiry.enquiryProducts || [];
      alert(`Enquiry "${enquiry.enquiryName}" has been submitted successfully with ${enquiryProducts.length} product(s).`);
    
    handleCloseSubmitModal();
    } catch (error: any) {
      console.error('Error submitting enquiry:', error);
      alert(error.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  const getProductById = (productId: string): ProductSheetItem | undefined => {
    return productSheetItems.find((p) => p._id === productId);
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
    // Require authentication before creating enquiry
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
    setSelectedProductIds([]);
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
    setSelectedProductIds([]);
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
    setGeneratedFields(null);
    setSpecFormData({});
  };

  const handleGenerateProduct = async () => {
    if (!productKeyword.trim()) {
      alert('Please enter a product keyword');
      return;
    }

    setIsGenerating(true);
    try {
      // Call backend to generate fields from keyword
      const fields = await generateFieldsFromKeyword(productKeyword.trim());
      
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

  const handleAddGeneratedProductToEnquiry = async () => {
    if (!generatedFields) return;

    // Require authentication
    if (!requireAuth()) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      requireAuth();
      return;
    }

    try {
      // Convert form data to userAttributes format
      const userAttributes: Record<string, any> = {};
      Object.entries(specFormData).forEach(([label, value]) => {
        if (value !== '' && value !== 0 && value !== null && value !== undefined) {
          userAttributes[label] = value;
        }
      });

      // Create product item
      const newProduct = await addProductItem(token, {
        productSource: 'ai_generated',
        displayName: generatedFields.item || productKeyword,
        category: generatedFields.item || 'General',
        userAttributes: userAttributes,
        adminProductId: null,
        externalRef: null,
      });

      // Reload product sheet items
      await loadProducts();

      // Add to selected products
      if (newProduct._id) {
        setNewEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
      }

      // Close modal and reset
      handleCloseGenerateProductModal();
      alert('Product generated and added to enquiry successfully!');
    } catch (error: any) {
      console.error('Error adding generated product:', error);
      alert(error.message || 'Failed to add product. Please try again.');
    }
  };

  const handleSaveNewEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Require authentication before saving enquiry
    if (!requireAuth()) {
      return;
    }
    
    if (!enquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    // Validate required address fields
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

      await loadEnquiries();
    handleCloseNewEnquiryModal();
    } catch (error: any) {
      console.error('Error creating enquiry:', error);
      alert(error.message || 'Failed to create enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProductModal = (enquiryId: string) => {
    // Require authentication before opening product modal
    if (!requireAuth()) {
      return;
    }

    setSelectedEnquiryId(enquiryId);
    setModalProducts(productSheetItems);
    
    // Load existing enquiry to get already added products
    const enquiry = enquiries.find((e) => e._id === enquiryId);
    
    // Initialize selected products list
    const enquiryProductIds = enquiry?.enquiryProducts?.map((p: any) => 
      typeof p === 'string' ? p : p._id || p
    ) || [];
    setSelectedProductIds(enquiryProductIds);
    
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
      setSelectedProductIds([]);
    }, 300);
  };

  const handleToggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleAddProductsToEnquiry = async () => {
    // Require authentication before adding products
    if (!requireAuth()) {
      return;
    }

    if (!selectedEnquiryId) return;

    const token = getAuthToken();
    if (!token) {
      requireAuth();
      return;
    }

    try {
      await updateEnquiry(token, selectedEnquiryId, {
        enquiryProducts: selectedProductIds,
      });

      await loadEnquiries();

      // Show success message
      const enquiry = enquiries.find((e) => e._id === selectedEnquiryId);
      alert(`Successfully added ${selectedProductIds.length} product(s) to "${enquiry?.enquiryName || 'enquiry'}".`);
      
      // Close the drawer
      handleCloseProductModal();
    } catch (error: any) {
      console.error('Error updating enquiry:', error);
      alert(error.message || 'Failed to add products. Please try again.');
    }
  };

  const isProductAddedToEnquiry = (productId: string): boolean => {
    return selectedProductIds.includes(productId);
  };

  const getAddedProductsCount = (): number => {
    return selectedProductIds.length;
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
        currentUser={currentUser}
        onLogout={() => {
          router.push('/login');
        }}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
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
              {isLoading ? (
                <div className="flex h-full items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <p className="text-gray-400">Loading enquiries...</p>
                  </div>
                </div>
              ) : enquiries.length === 0 ? (
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
                      Create your first enquiry
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {enquiries.map((enquiry) => {
                    const enquiryId = enquiry._id || '';
                    const isExpanded = expandedEnquiries.has(enquiryId);
                    const enquiryProducts = Array.isArray(enquiry.enquiryProducts) 
                      ? enquiry.enquiryProducts 
                      : [];
                    const totalProducts = enquiryProducts.length;

                    return (
                      <div
                        key={enquiryId}
                        className="bg-[#40414F] rounded-lg border border-gray-700 overflow-hidden"
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleEnquiry(enquiryId)}
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
                                {enquiry.enquiryName}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>
                                  {totalProducts} product{totalProducts !== 1 ? 's' : ''}
                                </span>
                                <span>•</span>
                                <span>Status: {enquiry.enquiryStatus || 'draft'}</span>
                                <span>•</span>
                                <span>Created {formatDate(enquiry.createdAt as string)}</span>
                                {enquiry.updatedAt && enquiry.updatedAt !== enquiry.createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>Updated {formatDate(enquiry.updatedAt as string)}</span>
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
                                handleOpenProductModal(enquiryId);
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
                                toggleEnquiry(enquiryId);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-gray-200 bg-[#202123] hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              {isExpanded ? 'Hide products' : 'View products'}
                            </button>
                            {/* 3-dot Menu */}
                            <div className="relative" ref={(el) => { menuRefs.current[enquiryId] = el; }}>
                              <button
                                onClick={(e) => toggleMenu(enquiryId, e)}
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
                              {openMenuId === enquiryId && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#40414F] border border-gray-600 rounded-lg shadow-lg z-10 overflow-hidden">
                                  <button
                                    onClick={(e) => handleSubmitEnquiry(enquiryId, e)}
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
                                    onClick={(e) => handleDeleteEnquiry(enquiryId, e)}
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
                                  onClick={() => handleOpenProductModal(enquiryId)}
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
                                  onClick={() => handleOpenProductModal(enquiryId)}
                                  className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                  Add Products
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {enquiryProducts.map((product: any, index: number) => {
                                  // Handle both string IDs and populated product objects
                                  const productId = typeof product === 'string' ? product : (product._id || product.id);
                                  const productData = typeof product === 'string' 
                                    ? getProductById(productId)
                                    : product;
                                  
                                  if (!productData) {
                                    return (
                                      <div
                                        key={index}
                                        className="p-4 bg-[#343541] rounded-lg border border-gray-600 text-gray-400"
                                      >
                                        Product not found (ID: {productId})
                                      </div>
                                    );
                                  }

                                  // Extract specifications from userAttributes
                                  const specifications: string[] = [];
                                  if (productData.userAttributes) {
                                    Object.entries(productData.userAttributes).forEach(([key, value]) => {
                                      if (value !== '' && value !== 0 && value !== null) {
                                        if (Array.isArray(value)) {
                                          specifications.push(`${key}: ${value.join(', ')}`);
                                        } else {
                                          specifications.push(`${key}: ${value}`);
                                        }
                                      }
                                    });
                                  }

                                  const imageLink = productData.userAttributes?.image_link || 
                                                    productData.userAttributes?.Image_Attachment || '';

                                  return (
                                    <div
                                      key={index}
                                      className="flex items-start gap-4 p-4 bg-[#343541] rounded-lg border border-gray-600 hover:bg-[#3A3B45] transition-colors"
                                    >
                                      {/* Product Image */}
                                      <div className="flex-shrink-0">
                                        {imageLink ? (
                                          <img
                                            src={imageLink}
                                            alt={productData.displayName || 'Product'}
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
                                            {productData.category && (
                                            <span className="inline-block px-2 py-0.5 bg-[#202123] text-gray-300 text-xs font-medium rounded-full mb-1">
                                                {productData.category.toUpperCase()}
                                            </span>
                                            )}
                                            
                                            {/* Product Name */}
                                            <h4 className="text-base font-semibold text-white mt-1 mb-2">
                                              {productData.displayName || 'Unnamed Product'}
                                            </h4>

                                            {/* Specifications */}
                                            {specifications.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                                {specifications.slice(0, 3).map((spec, specIndex) => (
                                                  <span
                                                    key={specIndex}
                                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-300 rounded"
                                                  >
                                                    {spec}
                                                  </span>
                                                ))}
                                                {specifications.length > 3 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openSpecModal(specifications, productData.displayName)}
                                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-400 rounded hover:text-white transition-colors"
                                                  >
                                                    +{specifications.length - 3} more
                                                  </button>
                                                )}
                                              </div>
                                            )}
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
                  Please provide the shipping and billing addresses for this enquiry.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Shipping Address</h3>
                </div>
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
                  disabled={isSubmitting}
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
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
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
                      {modalProducts.map((product: ProductSheetItem) => (
                    <div
                      key={product._id}
                      className="flex items-start gap-4 p-4 border border-gray-700 rounded-lg hover:bg-[#2d2d2d] transition-colors"
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {(() => {
                          const imageLink = product.userAttributes?.image_link || 
                                            product.userAttributes?.Image_Attachment || '';
                          return imageLink ? (
                          <img
                              src={imageLink}
                              alt={product.displayName || 'Product'}
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
                          );
                        })()}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-3">
                          <div className="flex-1">
                            {/* Category */}
                            {product.category && (
                            <span className="inline-block px-2 py-0.5 bg-[#202123] text-gray-300 text-xs font-medium rounded-full mb-1">
                              {product.category.toUpperCase()}
                            </span>
                            )}
                            
                            {/* Product Name */}
                            <h3 className="text-base font-semibold text-white mt-1 mb-2">
                              {product.displayName || 'Unnamed Product'}
                            </h3>

                            {/* Specifications */}
                            {(() => {
                              const specifications: string[] = [];
                              if (product.userAttributes) {
                                Object.entries(product.userAttributes).forEach(([key, value]) => {
                                  if (value !== '' && value !== 0 && value !== null) {
                                    if (Array.isArray(value)) {
                                      specifications.push(`${key}: ${value.join(', ')}`);
                                    } else {
                                      specifications.push(`${key}: ${value}`);
                                    }
                                  }
                                });
                              }
                              return specifications.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                  {specifications.slice(0, 3).map((spec, index) => (
                                  <span
                                    key={index}
                                    className="text-xs px-2 py-1 bg-[#202123] text-gray-300 rounded"
                                  >
                                    {spec}
                                  </span>
                                ))}
                                  {specifications.length > 3 && (
                                  <span className="text-xs px-2 py-1 bg-[#202123] text-gray-400 rounded">
                                      +{specifications.length - 3} more
                                  </span>
                                )}
                              </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Selection Button */}
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">

                        {/* Toggle Selection Button */}
                          <button
                          onClick={() => handleToggleProductSelection(product._id || '')}
                          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                            isProductAddedToEnquiry(product._id || '')
                              ? 'bg-green-600/20 text-green-400'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isProductAddedToEnquiry(product._id || '') ? (
                            <>
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
                              Selected
                            </>
                        ) : (
                            <>
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
                              Select
                            </>
                          )}
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
                  onClick={handleAddProductsToEnquiry}
                  disabled={selectedProductIds.length === 0}
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
                  Add {selectedProductIds.length > 0 ? `${selectedProductIds.length} ` : ''}Product{selectedProductIds.length !== 1 ? 's' : ''} to Enquiry
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
              {!generatedFields ? (
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
                      disabled={isGenerating}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateProduct}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      {isGenerating ? (
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
                      {generatedFields.item}
                    </h4>
                    <span className="text-xs text-gray-500">AI Generated</span>
                  </div>

                  {/* Generated Fields */}
                  <div className="space-y-4">
                    {generatedFields.fields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.type !== 'textarea' && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'dropdown' && field.options ? (
                          <CreatableSelect
                            value={(specFormData[field.label] as string[]) || []}
                            onChange={(value) => handleSpecInputChange(field.label, value)}
                            options={field.options}
                            placeholder={`Select ${field.label.toLowerCase()}`}
                            required
                            className="w-full"
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., Specific brand preferences, desired features like touchscreen, backlit keyboard, ideal delivery date.`}
                            rows={4}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y placeholder:text-gray-400"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={(specFormData[field.label] as number) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, parseFloat(e.target.value) || 0)}
                            placeholder={field.placeholder || `e.g., 50`}
                            className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400"
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
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
              {generatedFields ? (
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

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#40414F] rounded-lg p-6">
            <p className="text-white">Loading enquiries...</p>
          </div>
        </div>
      )}
    </main>
  );
}

