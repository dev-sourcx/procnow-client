'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatContainer from '@/components/ChatContainer';
import Sidebar from '@/components/Sidebar';
import { getCurrentUser, type CurrentUser, getChatSessions, ChatSession as BackendChatSession, generateFieldsFromDescription, GeneratedFieldsResponse } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  getAuthToken, 
  clearAuthToken, 
  ChatSession,
  getGuestSession,
  saveGuestSession,
  deleteGuestSession,
  saveProduct,
  getStoredProducts,
  deleteProduct,
  BriefProduct,
  getStoredEnquiries,
  saveEnquiry,
  deleteEnquiry,
  Enquiry,
  EnquiryProduct,
} from '@/lib/storage';
import { requireAuth } from '@/lib/auth';
import CreatableSelect from '@/components/CreatableSelect';

export default function Home() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeMode, setActiveMode] = useState<'discover' | 'specify'>('discover');
  
  // Brief/Specify mode state
  const [activeTab, setActiveTab] = useState<'add'>('add');
  const [itemInput, setItemInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | File | null | string[]>>({});
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
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
  const [customFields, setCustomFields] = useState<Array<{id: string; label: string; type: 'text' | 'number' | 'textarea' | 'dropdown' | 'file'; options?: string[]; value: string | number | File | null | string[]}>>([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'textarea' | 'dropdown' | 'file'>('dropdown');
  const [newFieldOptions, setNewFieldOptions] = useState<string>('');
  const [enquiryProductsUpdate, setEnquiryProductsUpdate] = useState(0);
  const [expandedEnquiries, setExpandedEnquiries] = useState<Record<string, boolean>>({});
  const [customValues, setCustomValues] = useState<Record<string, string[]>>({});
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] = useState<string>('Specifications');

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        // Don't redirect - allow user to browse without login
        // Load guest session from localStorage
        const guestSession = getGuestSession();
        if (guestSession) {
          setSessions([guestSession]);
          setCurrentSessionId(guestSession.id);
        } else {
          setSessions([]);
          setCurrentSessionId(null);
        }
        setIsCheckingAuth(false);
        return;
      }

      try {
        const user = await getCurrentUser(token);
        setCurrentUser(user);
        // If successful, load sessions from backend
        try {
          const backendSessions = await getChatSessions(token);
          // Convert backend sessions to frontend format
          const convertedSessions: ChatSession[] = backendSessions.map((s) => ({
            id: s._id,
            title: s.title,
            createdAt: new Date(s.createdAt).getTime(),
            updatedAt: new Date(s.updatedAt).getTime(),
          }));
          setSessions(convertedSessions);
        } catch (error) {
          console.error('Error loading sessions from backend:', error);
          // On error, don't load any sessions
          setSessions([]);
        }
      } catch {
        // Token is invalid, clear it but don't redirect
        clearAuthToken();
        setCurrentUser(null);
        setSessions([]);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleNewChat = () => {
    const token = getAuthToken();
    if (!token) {
      // If not authenticated, clear guest session and start new one
      deleteGuestSession();
      setSessions([]);
      setCurrentSessionId(null);
    } else {
      // If authenticated, just clear current session
      setCurrentSessionId(null);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSessionDelete = async (sessionId: string) => {
    // Remove from local state
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    
    // If deleted session was current, clear it
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    router.push('/');
  };

  // Brief/Specify mode handlers
  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  const loadEnquiries = () => {
    const storedEnquiries = getStoredEnquiries();
    setEnquiries(storedEnquiries);
    window.dispatchEvent(new Event('enquiryUpdated'));
  };

  useEffect(() => {
    if (activeMode === 'specify') {
      loadProducts();
      loadEnquiries();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'brief_products') {
          loadProducts();
        }
        if (e.key === 'brief_enquiries') {
          loadEnquiries();
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('productAdded', loadProducts);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('productAdded', loadProducts);
      };
    }
  }, [activeMode]);

  const handleGenerateWithAI = async () => {
    if (!itemInput.trim()) {
      alert('Please enter an item name');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const productData = {
        product_name: itemInput.trim(),
        description: `Product: ${itemInput.trim()}`,
      };

      const fields = await generateFieldsFromDescription(productData);
      
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
      
      const fieldsWithDefaults: GeneratedFieldsResponse = {
        ...fields,
        fields: [...fields.fields, ...defaultFields],
      };
      
      setGeneratedFields(fieldsWithDefaults);
      
      const initialData: Record<string, string | number | File | null | string[]> = {};
      fieldsWithDefaults.fields.forEach((field) => {
        if (field.type === 'file') {
          initialData[field.label] = null;
        } else if (field.type === 'dropdown') {
          initialData[field.label] = [];
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

  const handleClearForm = () => {
    setGeneratedFields(null);
    setFormData({});
    setImageUrl('');
    setError(null);
    setItemInput('');
    setCustomValues({});
    setDropdownSearch({});
    setDropdownOpen({});
    setCustomFields([]);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(productId);
      loadProducts();
    }
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

  const handleAddCustomValue = (label: string, value: string, options: string[] = []) => {
    if (!value.trim()) return;
    const trimmed = value.trim();
    const existsInOptions = options.some((opt) => opt.toLowerCase() === trimmed.toLowerCase());
    const existsInCustom = (customValues[label] || []).some((opt) => opt.toLowerCase() === trimmed.toLowerCase());

    if (!existsInOptions && !existsInCustom) {
      setCustomValues((prev) => ({ ...prev, [label]: [...(prev[label] || []), trimmed] }));
    }

    setFormData((prev) => ({ ...prev, [label]: trimmed }));
    setDropdownSearch((prev) => ({ ...prev, [label]: '' }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const handleSelectOption = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
    setDropdownSearch((prev) => ({ ...prev, [label]: '' }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const openSpecModal = (items: string[], title?: string) => {
    setSpecModalItems(items);
    setSpecModalTitle(title || 'Specifications');
    setSpecModalOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;

    const fieldId = `custom_${Date.now()}`;
    const options = newFieldOptions.trim()
      ? newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
      : undefined;

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: 'dropdown' as const,
      options,
      value: newFieldOptions.trim() ? [] : [],
    };

    setCustomFields((prev) => [...prev, newField]);
    setFormData((prev) => ({
      ...prev,
      [newField.label]: newField.value,
    }));

    setNewFieldLabel('');
    setNewFieldType('dropdown');
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requireAuth()) {
      return;
    }
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
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

      try {
        saveProduct(briefProduct);
      } catch (saveError: any) {
        if (saveError.message && saveError.message.includes('logged in')) {
          requireAuth();
          return;
        }
        throw saveError;
      }
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('productAdded'));
      }
      
      loadProducts();
      handleClearForm();
      alert('Product saved successfully!');
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.message && error.message.includes('logged in')) {
        setError('You must be logged in to save products. Please log in and try again.');
      } else {
        setError('Failed to save product. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEnquiry = () => {
    if (!requireAuth()) {
      return;
    }

    setIsEnquiryModalOpen(true);
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
  };

  const handleCloseEnquiryModal = () => {
    setIsEnquiryModalOpen(false);
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
  };

  const handleSaveEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requireAuth()) {
      return;
    }
    
    if (!enquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    if (
      !shippingAddress.addressLine1.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.state.trim() ||
      !shippingAddress.zipCode.trim() ||
      !shippingAddress.country.trim()
    ) {
      alert('Please fill in all required shipping address fields.');
      return;
    }

    const newEnquiry: Enquiry = {
      id: `enquiry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: enquiryName.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shippingAddress: shippingAddress,
    };

    saveEnquiry(newEnquiry);
    loadEnquiries();
    handleCloseEnquiryModal();
  };


  if (isCheckingAuth) {
    return (
      <main className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-gray-700 dark:text-gray-300 font-medium">
            Welcome, {currentUser?.name || 'Client'}
          </div>
        </div>

        {/* Main Title Section */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Product Discovery</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Find and specify products for your enquiry.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab Switch Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setActiveMode('discover')}
                  className={`relative px-4 py-2 font-medium flex items-center gap-2 transition-colors rounded-md ${
                    activeMode === 'discover'
                      ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
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
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                  Discover
                </button>
                <button
                  onClick={() => setActiveMode('specify')}
                  className={`relative px-4 py-2 font-medium flex items-center gap-2 transition-colors rounded-md ${
                    activeMode === 'specify'
                      ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
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
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  Specify
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        {activeMode === 'discover' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            <ChatContainer
              currentSessionId={currentSessionId}
              onSessionUpdate={() => {
                // Defer state updates to avoid setState during render
                setTimeout(async () => {
                  const token = getAuthToken();
                  if (token) {
                    try {
                      // Reload sessions from backend
                      const backendSessions = await getChatSessions(token);
                      const convertedSessions: ChatSession[] = backendSessions.map((s) => ({
                        id: s._id,
                        title: s.title,
                        createdAt: new Date(s.createdAt).getTime(),
                        updatedAt: new Date(s.updatedAt).getTime(),
                      }));
                      setSessions(convertedSessions);
                    } catch (error) {
                      console.error('Error reloading sessions from backend:', error);
                      setSessions([]);
                    }
                  } else {
                    // Reload guest session from localStorage
                    const guestSession = getGuestSession();
                    if (guestSession) {
                      setSessions([guestSession]);
                      setCurrentSessionId((prevId) => {
                        // Only update if not already set to avoid unnecessary re-renders
                        return prevId || guestSession.id;
                      });
                    } else {
                      setSessions([]);
                    }
                  }
                }, 0);
              }}
            />
          </div>
        )}

        {/* Brief/Specify Content */}
        {activeMode === 'specify' && (
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="w-full">
              <>
                  {/* Item Enquiry Input Card */}
                  <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
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
                        className="text-gray-400"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                      </svg>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Q What item do you need?
                      </h2>
                    </div>

                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={itemInput}
                        onChange={(e) => setItemInput(e.target.value)}
                        placeholder="Enter item name (e.g., Laptop, Office Chair, Smartphone...)"
                        className="flex-1 px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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

                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Our AI will automatically identify the key specifications needed for your item.
                    </p>
                  </div>

                  {/* Generated Fields Form */}
                  {generatedFields && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {generatedFields.item}
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill in the specifications below</p>
                        </div>
                        <button
                          onClick={handleClearForm}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      {error && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Image URL Field */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                            Product Image URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enter a URL to an image of the product
                          </p>
                        </div>

                        {/* Add Custom Field Button */}
                        <div className="flex items-center justify-end mb-4">
                          <button
                            type="button"
                            onClick={() => setIsAddFieldModalOpen(true)}
                            className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors flex items-center gap-2"
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

                        {/* Fields Grid - Simplified version, full implementation would include all field types */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {generatedFields.fields.map((field, index) => (
                            <div key={index} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {field.label}
                              </label>
                              {field.type === 'dropdown' && field.options ? (
                                <CreatableSelect
                                  value={(formData[field.label] as string[]) || []}
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
                                  className="w-full px-3 py-2.5 min-h-[110px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                  required
                                />
                              ) : field.type === 'number' ? (
                                <input
                                  type="number"
                                  value={(formData[field.label] as number) || ''}
                                  onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                                  placeholder={field.placeholder}
                                  className="w-full h-11 px-3 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                                    className="w-full h-11 px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 file:mr-3 file:h-full file:px-3 file:py-0 file:rounded-md file:border file:border-gray-300 dark:file:border-gray-600 file:bg-white dark:file:bg-gray-800 file:text-gray-800 dark:file:text-gray-100 file:text-sm file:font-medium file:leading-normal hover:file:bg-gray-50 dark:hover:file:bg-gray-700 file:cursor-pointer"
                                  />
                                  {formData[field.label] instanceof File && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
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
                                      <span className="truncate">{formData[field.label] instanceof File ? (formData[field.label] as File).name : ''}</span>
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
                              ) : (
                                <input
                                  type="text"
                                  value={(formData[field.label] as string) || ''}
                                  onChange={(e) => handleInputChange(field.label, e.target.value)}
                                  placeholder={field.placeholder}
                                  className="w-full h-11 px-3 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-300 dark:focus:border-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                  required
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={handleClearForm}
                            className="px-4 py-2 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Added Products ({products.length} item{products.length !== 1 ? 's' : ''})
                        </h3>
                        <button
                          onClick={() => router.push('/product-sheet')}
                          className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors"
                        >
                          View All
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Product Name</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Key Specifications</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Added</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((product) => (
                              <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg
                                          width="20"
                                          height="20"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="text-gray-500 dark:text-gray-400"
                                        >
                                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                          <polyline points="21 15 16 10 5 21"></polyline>
                                        </svg>
                                      </div>
                                    )}
                                    <span className="text-sm text-gray-900 dark:text-white font-medium">
                                      {product.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                    {product.category}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap gap-2">
                                    {product.specifications.slice(0, 3).map((spec, index) => (
                                      <span
                                        key={index}
                                        className="inline-block px-3 py-1 bg-gray-800 dark:bg-gray-700 text-gray-300 dark:text-gray-400 text-xs font-medium rounded-full"
                                      >
                                        {spec}
                                      </span>
                                    ))}
                                    {product.specifications.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => openSpecModal(product.specifications, product.name)}
                                        className="inline-block px-3 py-1 bg-gray-800 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-xs font-medium rounded-full hover:text-white dark:hover:text-gray-300 transition-colors"
                                      >
                                        +{product.specifications.length - 3} more
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-400 dark:text-gray-500">
                                  {product.addedDate}
                                </td>
                                <td className="py-4 px-4">
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
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
              </>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Specifications Modal */}
      {specModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSpecModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{specModalTitle}</h3>
              <button
                onClick={() => setSpecModalOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
              <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
                {specModalItems.map((item, idx) => (
                  <li key={idx} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSpecModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Field Modal - Simplified, full version would include all field types */}
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400"
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
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(false)}
                  className="px-4 py-2 text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  disabled={!newFieldLabel.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Modal - Simplified version */}
      {isEnquiryModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseEnquiryModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Enquiry</h2>
              <button
                onClick={handleCloseEnquiryModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

            <form onSubmit={handleSaveEnquiry} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enquiry Name
                </label>
                <input
                  type="text"
                  value={enquiryName}
                  onChange={(e) => setEnquiryName(e.target.value)}
                  placeholder="Enter enquiry name"
                  className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  autoFocus
                  required
                />
              </div>

              {/* Shipping Address fields - Simplified, full version would include all fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine1}
                    onChange={(e) =>
                      setShippingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                    }
                    placeholder="Street address"
                    required
                    className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                      }
                      placeholder="City"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, state: e.target.value }))
                      }
                      placeholder="State"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                      }
                      placeholder="ZIP"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) =>
                        setShippingAddress((prev) => ({ ...prev, country: e.target.value }))
                      }
                      placeholder="Country"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseEnquiryModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
