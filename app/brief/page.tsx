'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateFieldsFromDescription, GeneratedFieldsResponse } from '@/lib/api';
import { saveProduct, getStoredProducts, deleteProduct, BriefProduct, getStoredEnquiries, saveEnquiry, deleteEnquiry, Enquiry, EnquiryProduct } from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import CreatableSelect from '@/components/CreatableSelect';

export default function BriefPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'add' | 'enquiries'>('add');
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
      
      // Initialize form data with empty values
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

  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  const loadEnquiries = () => {
    const storedEnquiries = getStoredEnquiries();
    setEnquiries(storedEnquiries);
    // Dispatch custom event for other pages to refresh
    window.dispatchEvent(new Event('enquiryUpdated'));
  };

  useEffect(() => {
    // Load products and enquiries from localStorage on mount
    loadProducts();
    loadEnquiries();

    // Listen for storage changes (when products are added from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brief_products') {
        loadProducts();
      }
      if (e.key === 'brief_enquiries') {
        loadEnquiries();
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
      value:
        newFieldOptions.trim()
          ? []
          : [],
    };

    setCustomFields((prev) => [...prev, newField]);
    
    // Initialize form data for the new field
    setFormData((prev) => ({
      ...prev,
      [newField.label]: newField.value,
    }));

    // Reset modal state
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
    setIsEnquiryModalOpen(true);
    setEnquiryName('');
  };

  const handleCloseEnquiryModal = () => {
    setIsEnquiryModalOpen(false);
    setEnquiryName('');
  };

  const handleSaveEnquiry = (e: React.FormEvent) => {
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
    handleCloseEnquiryModal();
  };

  const handleDeleteEnquiry = (enquiryId: string) => {
    if (confirm('Are you sure you want to delete this enquiry?')) {
      deleteEnquiry(enquiryId);
      loadEnquiries();
    }
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

  const toggleEnquiryExpand = (enquiryId: string) => {
    setExpandedEnquiries((prev) => ({ ...prev, [enquiryId]: !prev[enquiryId] }));
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

  return (
    <>
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
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${
              isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Products to Enquiry
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Select products from your product sheet
                </p>
            </div>
              <button
                onClick={handleCloseProductModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No products available
                  </h3>
                  <p className="text-gray-600 text-center">
                    Add products to your product sheet first
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modalProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
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
      {isEnquiryModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseEnquiryModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                New Enquiry
              </h2>
              <button
                onClick={handleCloseEnquiryModal}
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
            <form onSubmit={handleSaveEnquiry} className="p-6">
              <div className="space-y-4">
            <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enquiry Name
                  </label>
                  <input
                    type="text"
                    value={enquiryName}
                    onChange={(e) => setEnquiryName(e.target.value)}
                    placeholder="Enter enquiry name"
                    className="w-full px-4 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                    autoFocus
                    required
                  />
            </div>
          </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEnquiryModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
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

      <main className="flex h-screen w-full bg-gray-50 text-gray-900">
        {/* Sidebar */}
        <Sidebar
          onNewChat={() => router.push('/')}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Sidebar Toggle Button (Mobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100"
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

          {/* Content Container */}
          <div className="flex h-full w-full flex-col bg-gray-50">
            {/* Header */}
            <div className="flex h-12 items-center justify-center border-b border-gray-200 bg-white px-4 shadow-sm">
              <h1 className="text-lg font-semibold text-gray-900">Brief</h1>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Tabs */}
                <div className="mb-6">
          <div className="flex items-center justify-between">
                    <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('add')}
                        className={`px-4 py-2.5 font-medium text-sm transition-colors rounded-lg flex items-center gap-2 border ${
                  activeTab === 'add'
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
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
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                + Add Products
              </button>
              <button
                onClick={() => setActiveTab('enquiries')}
                        className={`px-4 py-2.5 font-medium text-sm transition-colors rounded-lg flex items-center gap-2 border ${
                  activeTab === 'enquiries'
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Enquiries
              </button>
            </div>
            
                    {/* New Enquiry Button - Only show on enquiries tab */}
                    {activeTab === 'enquiries' && (
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
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Enquiry
              </button>
            )}
            
            {/* Create & Save Enquiry Button - Only show on add tab */}
            {activeTab === 'add' && (
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
                    )}
          </div>
        </div>

                {/* Enquiries Tab Content */}
                {activeTab === 'enquiries' && (
                  <>
                    {enquiries.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Document Icon */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-400"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  
                  {/* Empty State Text */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No enquiries yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create your first enquiry to get started
                  </p>
                </div>
              </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Enquiries ({enquiries.length})
                          </h3>
                        </div>
                        
                        <div className="space-y-3">
                          {enquiries.map((enquiry) => {
                            const isExpanded = expandedEnquiries[enquiry.id];
                            const productsInEnquiry =
                              enquiry.products?.map((p) => {
                                const productDetails = products.find((prod) => prod.id === p.productId);
                                return {
                                  ...p,
                                  name: productDetails?.name || 'Product',
                                  category: productDetails?.category || 'N/A',
                                  specs: productDetails?.specifications?.join(', '),
                                };
                              }) || [];

                            return (
                              <div
                                key={enquiry.id}
                                className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-blue-400"
                                      >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-base font-medium text-white truncate">
                                        {enquiry.name}
                                      </h4>
                                      <p className="text-sm text-gray-400">
                            Created: {new Date(enquiry.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => handleOpenProductModal(enquiry.id)}
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
                                      onClick={() => toggleEnquiryExpand(enquiry.id)}
                                      className="px-3 py-1.5 text-sm font-medium text-gray-200 bg-[#202123] hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                      {isExpanded ? 'Hide products' : 'View products'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEnquiry(enquiry.id)}
                                      className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
                                      aria-label="Delete enquiry"
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

                                {isExpanded && (
                                  <div className="mt-3 pt-3 border-t border-gray-700">
                                    {productsInEnquiry.length > 0 ? (
                                      <div className="space-y-2">
                                        {productsInEnquiry.map((p) => (
                                          <div
                                            key={`${enquiry.id}_${p.productId}`}
                                            className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#202123] border border-gray-700 rounded-lg px-3 py-2"
                                          >
                                            <div className="flex-1">
                                              <p className="text-sm font-semibold text-white">{p.name}</p>
                                              <p className="text-xs text-gray-300">
                                                Qty: {p.quantity} | Target: {p.targetPrice || 0} | Date: {p.deliveryDate || 'N/A'}
                                              </p>
                                              {p.specs && (
                                                <p className="text-xs text-gray-400 truncate">Specs: {p.specs}</p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-200 bg-[#202123] border border-gray-700 rounded-lg px-3 py-2">
                                        No products added yet.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
          </>
        )}

                {/* Add Products Tab Content */}
                {activeTab === 'add' && (
                  <>
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
                          className="text-gray-400"
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
                          className="flex-1 px-4 py-3 text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
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

                        <p className="text-sm text-gray-400">
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
                              <p className="text-sm text-red-700">{error}</p>
                            </div>
                          )}

                          <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Image URL Field - Full Width */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-800">
                                Product Image URL (Optional)
                              </label>
                              <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
                              />
                <p className="text-xs text-gray-500">
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

              {/* Fields in 3x3 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Render generated fields */}
                {generatedFields.fields.map((field, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
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
                        className="w-full px-3 py-2.5 min-h-[110px] text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 resize-none placeholder:text-gray-400"
                        required
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={(formData[field.label] as number) || ''}
                        onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                        placeholder={field.placeholder}
                        className="w-full h-11 px-3 py-2.5 text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
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
                          className="w-full h-11 px-3 py-2 text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 file:mr-3 file:h-full file:px-3 file:py-0 file:rounded-md file:border file:border-gray-300 file:bg-white file:text-gray-800 file:text-sm file:font-medium file:leading-normal hover:file:bg-gray-50 file:cursor-pointer"
                        />
                        {formData[field.label] instanceof File && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
                        className="w-full h-11 px-3 py-2.5 text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
                        required
                      />
                    )}
                  </div>
                ))}

                          {/* Render Custom Fields */}
                          {customFields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-300">
                                  {field.label}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomField(field.id, field.label)}
                                  className="p-1 hover:bg-red-600/20 rounded text-red-400 hover:text-red-300 transition-colors"
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
                                <div className="relative">
                                  {/* Selected Value Badge */}
                                  {formData[field.label] && (
                                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                                      <span className="px-3 py-1.5 bg-blue-600/30 text-blue-400 text-sm rounded-lg flex items-center gap-2">
                                        {formData[field.label] as string}
                                        {customValues[field.label]?.includes(formData[field.label] as string) && (
                                          <span className="px-1.5 py-0.5 bg-blue-600/50 text-blue-300 text-xs rounded">
                                            Custom
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormData((prev) => ({ ...prev, [field.label]: '' }));
                                            setDropdownSearch((prev) => ({ ...prev, [field.label]: '' }));
                                          }}
                                          className="ml-1 hover:bg-blue-600/50 rounded p-0.5"
                                        >
                                          <svg
                                            width="12"
                                            height="12"
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
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Searchable Input */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={dropdownSearch[field.label] || ''}
                                      onChange={(e) => handleDropdownSearch(field.label, e.target.value)}
                                      onFocus={() => setDropdownOpen((prev) => ({ ...prev, [field.label]: true }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && dropdownSearch[field.label]) {
                                          e.preventDefault();
                                          handleAddCustomValue(field.label, dropdownSearch[field.label], field.options || []);
                                        }
                                      }}
                                      placeholder={formData[field.label] ? `Search or add another ${field.label.toLowerCase()}` : `Search or add ${field.label.toLowerCase()}`}
                                      className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                                      required={!formData[field.label]}
                                    />
                                    {/* Dropdown Arrow */}
                                    <button
                                      type="button"
                                      onClick={() => setDropdownOpen((prev) => ({ ...prev, [field.label]: !prev[field.label] }))}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
                                        className={`transition-transform ${dropdownOpen[field.label] ? 'rotate-180' : ''}`}
                                      >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                      </svg>
                                    </button>
                                  </div>

                                  {/* Dropdown Options */}
                                  {dropdownOpen[field.label] && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#202123] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {(() => {
                                        const searchTerm = (dropdownSearch[field.label] || '').toLowerCase();
                                        const allOptions = [...(field.options || []), ...(customValues[field.label] || [])];
                                        const filteredOptions = allOptions.filter(opt => 
                                          opt.toLowerCase().includes(searchTerm)
                                        );
                                        const currentValue = formData[field.label] as string || '';
                                        
                                        return (
                                          <>
                                            {filteredOptions.map((option, optIndex) => {
                                              const isCustom = customValues[field.label]?.includes(option);
                                              const isSelected = currentValue === option;
                                              return (
                                                <div
                                                  key={optIndex}
                                                  onClick={() => handleSelectOption(field.label, option)}
                                                  className={`px-3 py-2 cursor-pointer hover:bg-[#2d2d2d] flex items-center justify-between ${
                                                    isSelected ? 'bg-blue-600/20' : ''
                                                  }`}
                                                >
                                                  <span className="text-white">{option}</span>
                                                  {isCustom && (
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-600/30 text-blue-400 text-xs rounded-full">
                                                      Custom
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                            
                                            {/* Add Custom Value Option */}
                                            {searchTerm && 
                                             !allOptions.some(opt => opt.toLowerCase() === searchTerm) && (
                                              <div
                                                onClick={() => handleAddCustomValue(field.label, dropdownSearch[field.label], field.options || [])}
                                                className="px-3 py-2 cursor-pointer hover:bg-[#2d2d2d] border-t border-gray-700 flex items-center gap-2 text-blue-400"
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
                                                <span>Add &quot;{dropdownSearch[field.label]}&quot;</span>
                                              </div>
                                            )}
                                            
                                            {filteredOptions.length === 0 && !searchTerm && (
                                              <div className="px-3 py-2 text-gray-400 text-sm">
                                                No options available
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              ) : field.type === 'textarea' ? (
                                <textarea
                                  value={(formData[field.label] as string) || ''}
                                  onChange={(e) => handleInputChange(field.label, e.target.value)}
                                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                                  rows={3}
                                  className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-500"
                                  required
                                />
                              ) : field.type === 'number' ? (
                                <input
                                  type="number"
                                  value={(formData[field.label] as number) || ''}
                                  onChange={(e) => handleInputChange(field.label, parseFloat(e.target.value) || 0)}
                                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                                  className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
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
                                    className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                                  />
                                  {formData[field.label] instanceof File && (
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
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
                                        className="ml-auto text-red-400 hover:text-red-300"
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
                                  className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                                  required
                                />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                          <button
                            type="button"
                            onClick={handleClearForm}
                            className="px-4 py-2 text-gray-400 bg-[#202123] hover:bg-[#2d2d2d] rounded-lg transition-colors"
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
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700">
                    Product Name
                  </th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700">
                    Category
                  </th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700">
                    Key Specifications
                  </th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700">
                    Added
                  </th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-700">
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
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg
                                      width="20"
                                      height="20"
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
                                    className="inline-block px-3 py-1 bg-[#202123] text-gray-300 text-xs font-medium rounded-full"
                          >
                            {spec}
                          </span>
                        ))}
                                {product.specifications.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => openSpecModal(product.specifications, product.name)}
                                    className="inline-block px-3 py-1 bg-[#202123] text-gray-400 text-xs font-medium rounded-full hover:text-white transition-colors"
                                  >
                                    +{product.specifications.length - 3} more
                                  </button>
                                )}
                      </div>
                    </td>
                            <td className="py-4 px-4 text-sm text-gray-400">
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
                )}
      </div>
    </div>
      </div>
    </div>
      </main>

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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Field Label
                </label>
                <input
                  type="text"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Enter field name"
                  className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Field Type
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value as typeof newFieldType)}
                  className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text" className="bg-[#202123]">Text</option>
                  <option value="number" className="bg-[#202123]">Number</option>
                  <option value="textarea" className="bg-[#202123]">Textarea</option>
                  <option value="dropdown" className="bg-[#202123]">Dropdown</option>
                  <option value="file" className="bg-[#202123]">File</option>
                </select>
              </div>

              {newFieldType === 'dropdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full px-3 py-2 text-white bg-[#202123] border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Separate options with commas
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddFieldModalOpen(false)}
                  className="px-4 py-2 text-gray-400 bg-[#202123] hover:bg-[#2d2d2d] rounded-lg transition-colors"
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
    </>
  );
}

