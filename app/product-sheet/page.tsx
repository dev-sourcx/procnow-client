'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getProductSheet, ProductSheetItem, generateFieldsFromKeyword, type GeneratedFieldsResponse, addProductItem, deleteProductItem, getEnquiries, createEnquiry, getBuyerProfile, type BuyerProfile, uploadFile } from '@/lib/api';
import { getAuthToken, getEnquiryDraft, saveEnquiryDraft, clearEnquiryDraft } from '@/lib/storage';
import CreatableSelect from '@/components/CreatableSelect';
import { showToast } from '@/lib/toast';

// Standard units for dropdown
const STANDARD_UNITS = [
  'pcs', 'kg', 'g', 'mg', 'ton', 'lb', 'oz',
  'm', 'cm', 'mm', 'km', 'ft', 'in', 'yd',
  'L', 'mL', 'gal', 'fl oz',
  'm²', 'cm²', 'ft²', 'in²',
  'm³', 'cm³', 'ft³', 'in³',
  'box', 'pack', 'set', 'pair', 'dozen', 'roll', 'sheet', 'unit'
];

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
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiKeyword, setAiKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [generatedFields, setGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [specFormData, setSpecFormData] = useState<Record<string, string | number | string[]>>({});
  const [isSubmittingSpec, setIsSubmittingSpec] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] = useState<string>('Description');
  const [enquiryCount, setEnquiryCount] = useState<number>(0);
  
  // State for description modal
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [descriptionModalContent, setDescriptionModalContent] = useState<string>('');
  const [descriptionModalProductName, setDescriptionModalProductName] = useState<string>('');
  
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
  const [enquiryAttachment, setEnquiryAttachment] = useState<File | null>(null);
  const [enquiryAttachmentUrl, setEnquiryAttachmentUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Buyer profile addresses
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [selectedShippingAddressIndex, setSelectedShippingAddressIndex] = useState<number | null>(null);
  const [selectedBillingAddressIndex, setSelectedBillingAddressIndex] = useState<number | null>(null);
  const [useNewShippingAddress, setUseNewShippingAddress] = useState(false);
  const [useNewBillingAddress, setUseNewBillingAddress] = useState(false);
  // Refs for address inputs
  const shippingAddressInputRef = useRef<HTMLInputElement>(null);
  const billingAddressInputRef = useRef<HTMLInputElement>(null);
  const [isShippingAddressModalOpen, setIsShippingAddressModalOpen] = useState(false);
  const [isBillingAddressModalOpen, setIsBillingAddressModalOpen] = useState(false);
  // Inline product generation for sidebar
  const [inlineProductKeyword, setInlineProductKeyword] = useState('');
  const [isGeneratingInline, setIsGeneratingInline] = useState(false);
  const [inlineGeneratedFields, setInlineGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [inlineSpecFormData, setInlineSpecFormData] = useState<Record<string, any>>({});
  // Product details state: maps productId to { quantity, targetPrice, unit }
  const [productDetails, setProductDetails] = useState<Record<string, { quantity: number; targetPrice: number; unit: string; isAdded?: boolean }>>({});
  // Track which product details are expanded (collapsible)
  const [expandedProductDetails, setExpandedProductDetails] = useState<Set<string>>(new Set());
  // Helper function to create default 5 empty custom product rows
  const createDefaultCustomRows = () => {
    return Array.from({ length: 5 }, (_, index) => ({
      id: `custom_${Date.now()}_${index}`,
      name: '',
      quantity: 0,
      unit: '',
      targetPrice: 0,
      isAdded: false,
    }));
  };

  // Custom product rows (for manual entry) - initialize with 5 empty rows
  const [customProductRows, setCustomProductRows] = useState<Array<{ id: string; name: string; quantity: number; unit: string; targetPrice: number; isAdded?: boolean }>>(createDefaultCustomRows());

  // Product selection for enquiry
  const [productSheetItems, setProductSheetItems] = useState<ProductSheetItem[]>([]);
  const [productCount, setProductCount] = useState<number>(0);
  const [isNewEnquiryProductModalOpen, setIsNewEnquiryProductModalOpen] = useState(false);
  const [newEnquirySelectedProductIds, setNewEnquirySelectedProductIds] = useState<string[]>([]);
  const [newEnquiryProductSearchQuery, setNewEnquiryProductSearchQuery] = useState('');
  
  // Generate product modal state
  const [isGenerateProductModalOpen, setIsGenerateProductModalOpen] = useState(false);
  const [productKeyword, setProductKeyword] = useState('');
  // State for product list AI generation modal
  const [isProductListAIModalOpen, setIsProductListAIModalOpen] = useState(false);
  const [productListAIGeneratedFields, setProductListAIGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [productListAIProductName, setProductListAIProductName] = useState('');
  const [isGeneratingProductListAI, setIsGeneratingProductListAI] = useState(false);
  const [productListAISpecFormData, setProductListAISpecFormData] = useState<Record<string, any>>({});
  const [currentProductIdForSpec, setCurrentProductIdForSpec] = useState<string | null>(null); // Track which product is being edited
  const [currentRowIdForSpec, setCurrentRowIdForSpec] = useState<string | null>(null); // Track which custom row is being edited
  // Store specifications per product (for selected products)
  const [productSpecifications, setProductSpecifications] = useState<Record<string, Record<string, any>>>({});
  // Store specifications per custom product row
  const [customProductSpecifications, setCustomProductSpecifications] = useState<Record<string, Record<string, any>>>({});
  // State for viewing product specifications
  const [isViewSpecModalOpen, setIsViewSpecModalOpen] = useState(false);
  const [viewSpecProductId, setViewSpecProductId] = useState<string | null>(null);
  const [viewSpecRowId, setViewSpecRowId] = useState<string | null>(null);
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);
  const [generatedFieldsForEnquiry, setGeneratedFieldsForEnquiry] = useState<GeneratedFieldsResponse | null>(null);
  const [specFormDataForEnquiry, setSpecFormDataForEnquiry] = useState<Record<string, string | number | string[]>>({});
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

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
    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    let addedDate = formatDate(new Date());
    
    if (item.createdAt) {
      try {
        addedDate = formatDate(new Date(item.createdAt));
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

  // Helper to load buyer profile (addresses)
  const loadBuyerProfile = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setBuyerProfile(null);
        return;
      }
      const profile = await getBuyerProfile(token);
      setBuyerProfile(profile);
    } catch (error) {
      console.error('Error loading buyer profile:', error);
    }
  };

  // Address helpers
  const formatAddressAsString = (address: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  }): string => {
    const parts: string[] = [];
    if (address.addressLine1) parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  };

  const getShippingAddressString = (): string => {
    if (
      selectedShippingAddressIndex !== null &&
      buyerProfile?.shippingAddress?.[selectedShippingAddressIndex] &&
      !useNewShippingAddress
    ) {
      return formatAddressAsString(buyerProfile.shippingAddress[selectedShippingAddressIndex]);
    }
    return formatAddressAsString(shippingAddress);
  };

  const getBillingAddressString = (): string => {
    if (
      selectedBillingAddressIndex !== null &&
      buyerProfile?.billingAddress?.[selectedBillingAddressIndex] &&
      !useNewBillingAddress
    ) {
      return formatAddressAsString(buyerProfile.billingAddress[selectedBillingAddressIndex]);
    }
    return formatAddressAsString(billingAddress);
  };

  // Attachment handler (upload to S3 and store URL)
  const handleEnquiryAttachmentChange = async (file: File | null) => {
    if (!file) {
      setEnquiryAttachment(null);
      setEnquiryAttachmentUrl('');
      return;
    }
    const token = getAuthToken();
    if (!token) {
      requireAuth();
      setEnquiryAttachment(null);
      setEnquiryAttachmentUrl('');
      return;
    }
    try {
      setEnquiryAttachment(file);
      const { url } = await uploadFile(token, file, 'buyer-enquiry-attachments');
      setEnquiryAttachmentUrl(url);
    } catch (error: any) {
      console.error('Error uploading enquiry attachment to S3:', error);
      showToast({
        type: 'error',
        message: error?.message || 'Failed to upload attachment. Please try again.',
      });
      setEnquiryAttachment(null);
      setEnquiryAttachmentUrl('');
    }
  };

  // Product details helpers
  const handleProductDetailChange = (
    productId: string,
    field: 'quantity' | 'targetPrice' | 'unit',
    value: string | number
  ) => {
    setProductDetails((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: prev[productId]?.quantity || 0,
        targetPrice: prev[productId]?.targetPrice || 0,
        unit: prev[productId]?.unit || '',
        [field]: value,
      },
    }));
  };

  const mapProductIdsToEnquiryProducts = (
    productIds: string[]
  ): string[] | { productId: string; quantity?: number; targetPrice?: number; unit?: string }[] => {
    const hasAnyDetails = productIds.some((productId) => {
      const details = productDetails[productId];
      return details && (details.quantity || details.targetPrice || details.unit);
    });

    if (!hasAnyDetails) {
      return productIds;
    }

    return productIds.map((productId) => {
      const details = productDetails[productId];
      if (details && (details.quantity || details.targetPrice || details.unit)) {
        return {
          productId,
          quantity: details.quantity || undefined,
          targetPrice: details.targetPrice || undefined,
          unit: details.unit || undefined,
        };
      }
      return { productId };
    });
  };

  // Helper function to combine selected products and custom products for enquiry
  // Only includes products that are in the ribbon (have isAdded === true)
  const getAllEnquiryProducts = (): any => {
    // Filter products that are in ribbon (isAdded === true)
    const ribbonProducts = newEnquirySelectedProductIds.filter((productId) => {
      const details = productDetails[productId];
      return details?.isAdded === true;
    });
    
    const selectedProducts = ribbonProducts.length > 0 
      ? mapProductIdsToEnquiryProducts(ribbonProducts) 
      : [];
    
    // Filter custom products that are in ribbon (isAdded === true)
    const customProducts = customProductRows
      .filter((row) => row.isAdded === true) // Only include rows explicitly added to ribbon
      .map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity > 0 ? row.quantity : undefined,
        targetPrice: row.targetPrice > 0 ? row.targetPrice : undefined,
        unit: row.unit.trim() || undefined,
      }));

    // Combine both arrays - handle both string[] and object[] cases
    const selectedArray = Array.isArray(selectedProducts) ? selectedProducts : [];
    return [...selectedArray, ...customProducts] as Array<string | { productId?: string; name?: string; quantity?: number; targetPrice?: number; unit?: string }>;
  };

  // Inline product generation handlers (AI in sidebar)
  const handleInlineGenerateProduct = async () => {
    if (!inlineProductKeyword.trim()) {
      alert('Please enter a product keyword');
      return;
    }

    setIsGeneratingInline(true);
    try {
      const fields = await generateFieldsFromKeyword(inlineProductKeyword.trim());
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
      setInlineSpecFormData(initialData);
      setInlineGeneratedFields(fields);
    } catch (error) {
      console.error('Error generating fields:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate fields. Please try again.');
    } finally {
      setIsGeneratingInline(false);
    }
  };

  const handleInlineSpecInputChange = (label: string, value: string | number | string[]) => {
    setInlineSpecFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleAddInlineGeneratedProduct = async () => {
    if (!inlineGeneratedFields) return;

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
      Object.entries(inlineSpecFormData).forEach(([label, value]) => {
        if (value !== '' && value !== 0 && value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length === 0) {
            return;
          }
          userAttributes[label] = value;
        }
      });

      const newProduct = await addProductItem(token, {
        productSource: 'ai_generated',
        displayName: inlineGeneratedFields.item || inlineProductKeyword,
        category: inlineGeneratedFields.item || 'General',
        userAttributes,
        adminProductId: null,
        externalRef: null,
      } as any);

      await loadProducts();

      if ((newProduct as any)._id) {
        setNewEnquirySelectedProductIds((prev) => [...prev, (newProduct as any)._id]);
      }

      setInlineProductKeyword('');
      setInlineGeneratedFields(null);
      setInlineSpecFormData({});
      alert('Product generated and added to enquiry successfully!');
    } catch (error: any) {
      console.error('Error adding generated product:', error);
      alert(error.message || 'Failed to add product. Please try again.');
    }
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
      showToast({ type: 'error', message: error.message || 'Failed to delete product. Please try again.' });
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
    setSpecModalTitle(title || 'Description');
    setIsSpecModalOpen(true);
  };

  useEffect(() => {
    // Check authentication first - redirect if not logged in
    if (!requireAuth()) {
      return;
    }

    // Load products and enquiry count
    loadProducts();
    loadEnquiryCount();

    // Load current user if authenticated
    const token = getAuthToken();
    if (token) {
      // User authentication handled by DashboardLayout
    }

    // Listen for custom events (product added from other components)
    const handleCustomStorageChange = () => {
      loadProducts();
      loadEnquiryCount(); // Reload enquiry count as well
    };
    
    window.addEventListener('productAdded', handleCustomStorageChange);
    window.addEventListener('enquiryUpdated', loadEnquiryCount);

    // Load draft from localStorage on mount
    const draft = getEnquiryDraft();
    if (draft) {
      if (draft.enquiryName) setEnquiryName(draft.enquiryName);
      if (draft.shippingAddress) setShippingAddress(draft.shippingAddress);
      if (draft.billingAddress) setBillingAddress(draft.billingAddress);
      if (draft.expectedDeliveryDate) setExpectedDeliveryDate(draft.expectedDeliveryDate);
      if (draft.enquiryStatus) setEnquiryStatus(draft.enquiryStatus);
      if (draft.enquiryNotes) setEnquiryNotes(draft.enquiryNotes);
      if (draft.selectedShippingAddressIndex !== undefined) setSelectedShippingAddressIndex(draft.selectedShippingAddressIndex);
      if (draft.selectedBillingAddressIndex !== undefined) setSelectedBillingAddressIndex(draft.selectedBillingAddressIndex);
      if (draft.useNewShippingAddress !== undefined) setUseNewShippingAddress(draft.useNewShippingAddress);
      if (draft.useNewBillingAddress !== undefined) setUseNewBillingAddress(draft.useNewBillingAddress);
      if (draft.newEnquirySelectedProductIds) setNewEnquirySelectedProductIds(draft.newEnquirySelectedProductIds);
      if (draft.productDetails) setProductDetails(draft.productDetails);
      if (draft.customProductRows) setCustomProductRows(draft.customProductRows);
      if (draft.productSpecifications) setProductSpecifications(draft.productSpecifications);
      if (draft.customProductSpecifications) setCustomProductSpecifications(draft.customProductSpecifications);
    }
    setIsDraftLoaded(true);

    return () => {
      window.removeEventListener('productAdded', handleCustomStorageChange);
      window.removeEventListener('enquiryUpdated', loadEnquiryCount);
    };
  }, []);

  // Save draft to localStorage whenever relevant state changes
  useEffect(() => {
    if (!isDraftLoaded) return;

    const draft = {
      enquiryName,
      shippingAddress,
      billingAddress,
      expectedDeliveryDate,
      enquiryStatus,
      enquiryNotes,
      selectedShippingAddressIndex,
      selectedBillingAddressIndex,
      useNewShippingAddress,
      useNewBillingAddress,
      newEnquirySelectedProductIds,
      productDetails,
      customProductRows,
      productSpecifications,
      customProductSpecifications
    };

    saveEnquiryDraft(draft);
  }, [
    isDraftLoaded,
    enquiryName,
    shippingAddress,
    billingAddress,
    expectedDeliveryDate,
    enquiryStatus,
    enquiryNotes,
    selectedShippingAddressIndex,
    selectedBillingAddressIndex,
    useNewShippingAddress,
    useNewBillingAddress,
    newEnquirySelectedProductIds,
    productDetails,
    customProductRows,
    productSpecifications,
    customProductSpecifications
  ]);


  // Enquiry sidebar handlers
  const handleCreateEnquiry = async () => {
    if (!requireAuth()) {
      return;
    }

    await loadBuyerProfile();

    setIsNewEnquiryModalOpen(true);
    
    // Only set initial products if no products are already in the form
    if (newEnquirySelectedProductIds.length === 0 && customProductRows.every(row => !row.name)) {
      setNewEnquirySelectedProductIds(selectedProductIds.length > 0 ? [...selectedProductIds] : []);
    }
  };

  const handleResetEnquiryForm = () => {
    if (!confirm('Are you sure you want to clear all filled data? This cannot be undone.')) {
      return;
    }
    
    // Clear draft from storage
    clearEnquiryDraft();
    
    // Reset all form state
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
    setSelectedShippingAddressIndex(null);
    setSelectedBillingAddressIndex(null);
    setUseNewShippingAddress(false);
    setUseNewBillingAddress(false);
    setInlineProductKeyword('');
    setInlineGeneratedFields(null);
    setInlineSpecFormData({});
    setProductDetails({});
    setExpandedProductDetails(new Set());
    setNewEnquirySelectedProductIds([]);
    setCustomProductRows(createDefaultCustomRows());
    setProductSpecifications({});
    setCustomProductSpecifications({});
    setEnquiryAttachment(null);
    setEnquiryAttachmentUrl('');
  };

  const handleCloseNewEnquiryModal = () => {
    setIsNewEnquiryModalOpen(false);
  };

  const handleCloseNewEnquiryProductModal = () => {
    setIsNewEnquiryProductModalOpen(false);
    setNewEnquiryProductSearchQuery('');
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
    setNewEnquiryProductSearchQuery('');
  };

  // Handler to add 5 empty custom product rows
  const handleAddCustomRows = () => {
    const newRows = Array.from({ length: 5 }, (_, index) => ({
      id: `custom_${Date.now()}_${index}`,
      name: '',
      quantity: 0,
      unit: '',
      targetPrice: 0,
    }));
    setCustomProductRows((prev) => [...prev, ...newRows]);
  };

  // Handler to update custom product row
  const handleCustomProductChange = (rowId: string, field: 'name' | 'quantity' | 'unit' | 'targetPrice', value: string | number) => {
    setCustomProductRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, [field]: value }
          : row
      )
    );
  };

  // Handler to remove custom product row
  const handleRemoveCustomRow = (rowId: string) => {
    setCustomProductRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  // Handler to remove selected product from enquiry
  const handleRemoveSelectedProduct = (productId: string) => {
    setNewEnquirySelectedProductIds((prev) => prev.filter((id) => id !== productId));
    // Also remove product details if any
    setProductDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[productId];
      return newDetails;
    });
  };

  // Handler to add product to ribbon
  const handleAddProductToRibbon = (productId: string) => {
    setProductDetails((prev) => {
      const currentDetails = prev[productId];
      const quantity = currentDetails?.quantity && currentDetails.quantity > 0 ? currentDetails.quantity : 1;
      const unit = currentDetails?.unit && currentDetails.unit.trim() !== '' ? currentDetails.unit : 'pcs';
      const targetPrice = currentDetails?.targetPrice || 0;
      return {
        ...prev,
        [productId]: {
          quantity,
          unit,
          targetPrice,
          isAdded: true, // Mark as explicitly added to ribbon
        },
      };
    });
  };

  // Handler to add custom product to ribbon
  const handleAddCustomProductToRibbon = (rowId: string) => {
    setCustomProductRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const quantity = row.quantity && row.quantity > 0 ? row.quantity : 1;
          const unit = row.unit && row.unit.trim() !== '' ? row.unit : 'pcs';
          return {
            ...row,
            quantity,
            unit,
            isAdded: true, // Mark as explicitly added to ribbon
          };
        }
        return row;
      })
    );
  };

  // Handler to open AI generation for a specific product (inline)
  const handleOpenAIForProduct = async (productId: string) => {
    const product = productSheetItems.find((p) => p._id === productId);
    if (product) {
      const productName = product.displayName || product.category || '';
      if (!productName.trim()) {
        alert('Product name is required to generate description');
        return;
      }
      
      setCurrentProductIdForSpec(productId);
      setCurrentRowIdForSpec(null);
      setIsGeneratingProductListAI(true);
      setProductListAIProductName(productName);
      setIsProductListAIModalOpen(true);
      
      try {
        const fields = await generateFieldsFromKeyword(productName.trim());
        setProductListAIGeneratedFields(fields);
        
        // Initialize form data with existing specifications or empty values
        const existingSpecs = productSpecifications[productId] || {};
        const initialData: Record<string, string | number | string[]> = {};
        fields.fields.forEach((field) => {
          if (existingSpecs[field.label] !== undefined) {
            initialData[field.label] = existingSpecs[field.label];
          } else if (field.type === 'dropdown') {
            initialData[field.label] = [];
          } else if (field.type === 'number') {
            initialData[field.label] = 0;
          } else {
            initialData[field.label] = '';
          }
        });
        setProductListAISpecFormData(initialData);
      } catch (error) {
        console.error('Error generating fields:', error);
        alert(error instanceof Error ? error.message : 'Failed to generate description. Please try again.');
        setIsProductListAIModalOpen(false);
      } finally {
        setIsGeneratingProductListAI(false);
      }
    }
  };

  // Handler to open AI generation for custom product
  const handleOpenAIForCustomProduct = async (rowId: string) => {
    const row = customProductRows.find((r) => r.id === rowId);
    if (!row || !row.name.trim()) {
      alert('Please enter a product name first');
      return;
    }
    
    setCurrentProductIdForSpec(null);
    setCurrentRowIdForSpec(rowId);
    setIsGeneratingProductListAI(true);
    setProductListAIProductName(row.name);
    setIsProductListAIModalOpen(true);
    
    try {
      const fields = await generateFieldsFromKeyword(row.name.trim());
      setProductListAIGeneratedFields(fields);
      
      // Initialize form data with existing specifications or empty values
      const existingSpecs = customProductSpecifications[rowId] || {};
      const initialData: Record<string, string | number | string[]> = {};
      fields.fields.forEach((field) => {
        if (existingSpecs[field.label] !== undefined) {
          initialData[field.label] = existingSpecs[field.label];
        } else if (field.type === 'dropdown') {
          initialData[field.label] = [];
        } else if (field.type === 'number') {
          initialData[field.label] = 0;
        } else {
          initialData[field.label] = '';
        }
      });
      setProductListAISpecFormData(initialData);
    } catch (error) {
      console.error('Error generating fields:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate specifications. Please try again.');
      setIsProductListAIModalOpen(false);
    } finally {
      setIsGeneratingProductListAI(false);
    }
  };

  // Handler to close product list AI modal
  const handleCloseProductListAIModal = () => {
    setIsProductListAIModalOpen(false);
    setProductListAIGeneratedFields(null);
    setProductListAIProductName('');
    setProductListAISpecFormData({});
    setCurrentProductIdForSpec(null);
    setCurrentRowIdForSpec(null);
  };

  // Handler to update product list AI spec form data
  const handleProductListAISpecInputChange = (label: string, value: string | number | string[]) => {
    setProductListAISpecFormData((prev) => ({ ...prev, [label]: value }));
  };

  // Handler to save specifications to product (only saves locally, doesn't create product)
  const handleSaveProductSpecifications = () => {
    if (currentProductIdForSpec) {
      // Save to selected product
      setProductSpecifications((prev) => ({
        ...prev,
        [currentProductIdForSpec]: { ...productListAISpecFormData }
      }));
      alert('Description saved successfully!');
      handleCloseProductListAIModal();
    } else if (currentRowIdForSpec) {
      // Save to custom product row
      setCustomProductSpecifications((prev) => ({
        ...prev,
        [currentRowIdForSpec]: { ...productListAISpecFormData }
      }));
      alert('Description saved successfully!');
      handleCloseProductListAIModal();
    }
  };

  // Handler to create product from custom row and add to enquiry
  const handleCreateProductFromRow = async (rowId: string) => {
    const token = getAuthToken();
    if (!token) {
      requireAuth();
      return;
    }

    try {
      const row = customProductRows.find((r) => r.id === rowId);
      if (!row || !row.name.trim()) {
        alert('Product name is required');
        return;
      }

      // Get saved specifications for this row
      const savedSpecs = customProductSpecifications[rowId] || {};

      // Prepare userAttributes from saved specifications
      const userAttributes: Record<string, any> = {};
      Object.entries(savedSpecs).forEach(([key, value]) => {
        // Include value if it's not empty string, null, or undefined
        // Allow 0, false, and empty arrays as valid values
        if (value !== '' && value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length === 0) {
            // Skip empty arrays
            return;
          }
          userAttributes[key] = value;
        }
      });

      // Create product in database - always include userAttributes even if empty
      const newProduct = await addProductItem(token, {
        productSource: 'ai_generated',
        displayName: row.name.trim(),
        category: 'Custom',
        userAttributes: Object.keys(userAttributes).length > 0 ? userAttributes : {},
        adminProductId: null,
        externalRef: null,
      });

      // Add the created product to the enquiry's product list
      if (newProduct._id) {
        setNewEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
        
        // Also set product details (quantity, unit, targetPrice) from the row
        // Always set product details to ensure it appears in ribbon
        // Use row values if available, otherwise use defaults (quantity: 1, unit: 'pcs')
        setProductDetails((prev) => ({
          ...prev,
          [newProduct._id]: {
            quantity: row.quantity && row.quantity > 0 ? row.quantity : 1,
            unit: row.unit && row.unit.trim() !== '' ? row.unit : 'pcs',
            targetPrice: row.targetPrice || 0,
            isAdded: true, // Mark as added since it's created and added
          }
        }));

        // Move specifications from custom row to the created product
        if (Object.keys(savedSpecs).length > 0) {
          setProductSpecifications((prev) => ({
            ...prev,
            [newProduct._id]: savedSpecs
          }));
        }

        // Remove the custom product row
        setCustomProductRows((prev) => prev.filter((r) => r.id !== rowId));
        
        // Remove saved specifications for this row
        setCustomProductSpecifications((prev) => {
          const newSpecs = { ...prev };
          delete newSpecs[rowId];
          return newSpecs;
        });
      }

      // Reload products to get the new one
      await loadProducts();

      showToast({
        type: 'success',
        message: 'Product created and added to enquiry successfully!',
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      showToast({
        type: 'error',
        message: error.message || 'Failed to create product. Please try again.',
      });
    }
  };

  // Handler to view product specifications
  const handleViewProductSpecifications = (productId?: string, rowId?: string) => {
    if (productId) {
      setViewSpecProductId(productId);
      setViewSpecRowId(null);
    } else if (rowId) {
      setViewSpecRowId(rowId);
      setViewSpecProductId(null);
    }
    setIsViewSpecModalOpen(true);
  };

  // Handler to toggle product details view - now shows specifications
  const handleToggleProductDetails = (productId: string) => {
    handleViewProductSpecifications(productId);
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

    const hasShippingAddress =
      (selectedShippingAddressIndex !== null &&
        buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) ||
      shippingAddress.addressLine1.trim();
    const hasBillingAddress =
      (selectedBillingAddressIndex !== null &&
        buyerProfile?.billingAddress?.[selectedBillingAddressIndex]) ||
      billingAddress.addressLine1.trim();

    if (!hasShippingAddress) {
      alert('Please enter a shipping address.');
      return;
    }

    if (!hasBillingAddress) {
      alert('Please enter a billing address.');
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

      let finalShippingAddress;
      if (
        selectedShippingAddressIndex !== null &&
        buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]
      ) {
        finalShippingAddress = buyerProfile.shippingAddress[selectedShippingAddressIndex];
      } else {
        finalShippingAddress = {
          addressLine1: shippingAddress.addressLine1.trim() || '',
          addressLine2: shippingAddress.addressLine2?.trim() || undefined,
          city: shippingAddress.city?.trim() || shippingAddress.addressLine1.trim(),
          state: shippingAddress.state?.trim() || shippingAddress.addressLine1.trim(),
          zipCode: shippingAddress.zipCode?.trim() || shippingAddress.addressLine1.trim(),
          country: shippingAddress.country?.trim() || shippingAddress.addressLine1.trim(),
        };
      }

      let finalBillingAddress;
      if (
        selectedBillingAddressIndex !== null &&
        buyerProfile?.billingAddress?.[selectedBillingAddressIndex]
      ) {
        finalBillingAddress = buyerProfile.billingAddress[selectedBillingAddressIndex];
      } else {
        finalBillingAddress = {
          addressLine1: billingAddress.addressLine1.trim() || '',
          addressLine2: billingAddress.addressLine2?.trim() || undefined,
          city: billingAddress.city?.trim() || billingAddress.addressLine1.trim(),
          state: billingAddress.state?.trim() || billingAddress.addressLine1.trim(),
          zipCode: billingAddress.zipCode?.trim() || billingAddress.addressLine1.trim(),
          country: billingAddress.country?.trim() || billingAddress.addressLine1.trim(),
        };
      }

      await createEnquiry(token, {
        enquiryName: enquiryName.trim(),
        shippingAddress: finalShippingAddress,
        billingAddress: finalBillingAddress,
        expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
        enquiryStatus,
        enquiryNotes: enquiryNotes || undefined,
        attachment: enquiryAttachmentUrl || undefined,
        enquiryProducts: getAllEnquiryProducts(),
      });

      await loadEnquiryCount();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('enquiryUpdated'));
      }
      
      // Clear draft on successful submission
      clearEnquiryDraft();
      
      // Reset form fields without confirmation
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
      setSelectedShippingAddressIndex(null);
      setSelectedBillingAddressIndex(null);
      setUseNewShippingAddress(false);
      setUseNewBillingAddress(false);
      setInlineProductKeyword('');
      setInlineGeneratedFields(null);
      setInlineSpecFormData({});
      setProductDetails({});
      setExpandedProductDetails(new Set());
      setNewEnquirySelectedProductIds([]);
      setCustomProductRows(createDefaultCustomRows());
      setProductSpecifications({});
      setCustomProductSpecifications({});
      setEnquiryAttachment(null);
      setEnquiryAttachmentUrl('');

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
      <>
      {/* Main Content Area */}
      <div className="w-full mx-auto px-6 py-6">
        {/* AI Generation Section - Separate on Top */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 rounded-xl mb-6">
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
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 rounded-xl mb-6">
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
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Cart</h3>
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
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 w-12">
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
                          className="custom-checkbox w-4 h-4 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                        />
                      </label>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-48">Product Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    
                    // Parse specifications to show as comma-separated text (exclude description and price)
                    const specText = product.specifications
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
                      })
                      .join(', ');

                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 w-12">
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
                              className="custom-checkbox w-4 h-4 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
                            />
                          </label>
                        </td>

                        {/* Product Name */}
                        <td className="py-4 px-4 w-48">
                          <div className="font-medium text-gray-900 dark:text-white break-words" title={product.name}>{product.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.addedDate}</div>
                        </td>

                        {/* Description */}
                        <td className="py-4 px-4">
                          <div 
                            className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors break-words"
                            style={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              wordBreak: 'break-word'
                            }}
                            onClick={() => {
                              if (specText && specText.length > 0) {
                                setDescriptionModalContent(specText);
                                setDescriptionModalProductName(product.name);
                                setIsDescriptionModalOpen(true);
                              }
                            }}
                            title={specText && specText.length > 0 ? 'Click to view full description' : undefined}
                          >
                            {specText || <span className="text-gray-400 dark:text-gray-500 italic">No description</span>}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 w-20">
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
        </div>
      </div>

      {/* Specifications Modal for AI Generated Products */}
      {isSpecModalOpen && generatedFields && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Specify Requirements for {generatedFields.item}
              </h2>
              <button
                onClick={handleCloseSpecModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {field.label}
                            {isRequired && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <textarea
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., dedicated graphics card, webcam, specific port types (USB-C), lightweight`}
                            rows={4}
                            className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            required={isRequired}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                            className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            required={isRequired}
                          />
                        ) : (
                          <input
                            type="text"
                            value={(specFormData[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., within 3-4 weeks`}
                            className="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            required={isRequired}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseSpecModal}
                  className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
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
                  {isSubmittingSpec ? 'Adding...' : 'Add to My Cart'}
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{specModalTitle}</h3>
              <button
                onClick={() => setIsSpecModalOpen(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                onClick={() => setIsSpecModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
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
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-4xl bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Create new enquiry
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Fill in the details to create a new enquiry
                  </p>
                </div>
                <button
                  onClick={handleCloseNewEnquiryModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                <form onSubmit={handleSaveNewEnquiry} className="px-6 py-4 space-y-6">
                  {/* Enquiry Details Section */}
                  <div className="space-y-4">

                    <div className='flex items-center gap-5'>
                      <div className='w-1/2'>
                        <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Enquiry Name <span className="text-red-500 dark:text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={enquiryName}
                          onChange={(e) => setEnquiryName(e.target.value)}
                          placeholder="e.g., Office Furniture Order Q1"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          autoFocus
                          required
                        />
                      </div>
                      {/* Expected Delivery Date Section */}
                      <div className="w-1/2">
                        <div className="flex items-center gap-2 mb-1">
                          <label className="block font-medium text-gray-700 dark:text-gray-300">
                            Expected Delivery Date <span className="text-red-500 dark:text-red-400">*</span>
                          </label>
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={expectedDeliveryDate}
                            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="dd-mm-yyyy"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Addresses Section */}
                  <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Shipping Address Input */}
                      <div>
                        <div className='flex justify-between'>
                          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2 self-end">
                            Shipping Address <span className="text-red-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsShippingAddressModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm mb-2 font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                        </div>
                        <div
                          onClick={() => {
                            if (!useNewShippingAddress && selectedShippingAddressIndex === null) {
                              setUseNewShippingAddress(true);
                              setTimeout(() => {
                                shippingAddressInputRef.current?.focus();
                              }, 0);
                            }
                          }}
                          className="relative"
                        >
                        <input
                            ref={shippingAddressInputRef}
                          type="text"
                          value={useNewShippingAddress ? getShippingAddressString() : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setShippingAddress({
                              addressLine1: value,
                              addressLine2: '',
                              city: '',
                              state: '',
                              zipCode: '',
                              country: '',
                              phone: '',
                              email: '',
                            });
                            setUseNewShippingAddress(true);
                            setSelectedShippingAddressIndex(null);
                          }}
                            onFocus={() => {
                              if (!useNewShippingAddress && selectedShippingAddressIndex === null) {
                                setUseNewShippingAddress(true);
                              }
                            }}
                          placeholder={
                            selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex] && !useNewShippingAddress
                              ? formatAddressAsString(buyerProfile.shippingAddress[selectedShippingAddressIndex])
                              : "Enter full shipping address"
                          }
                            disabled={!useNewShippingAddress}
                          required
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        />
                        </div>
                  </div>

                      {/* Billing Address Input */}
                      <div>
                        <div className='flex justify-between'>
                          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2 self-end">
                            Billing Address <span className="text-red-400">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsBillingAddressModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm mb-2 font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                        </div>
                        <div
                          onClick={() => {
                            if (!useNewBillingAddress && selectedBillingAddressIndex === null) {
                              setUseNewBillingAddress(true);
                              setTimeout(() => {
                                billingAddressInputRef.current?.focus();
                              }, 0);
                            }
                          }}
                          className="relative"
                        >
                        <input
                            ref={billingAddressInputRef}
                          type="text"
                          value={useNewBillingAddress ? getBillingAddressString() : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setBillingAddress({
                              addressLine1: value,
                              addressLine2: '',
                              city: '',
                              state: '',
                              zipCode: '',
                              country: '',
                              phone: '',
                              email: '',
                            });
                            setUseNewBillingAddress(true);
                            setSelectedBillingAddressIndex(null);
                          }}
                            onFocus={() => {
                              if (!useNewBillingAddress && selectedBillingAddressIndex === null) {
                                setUseNewBillingAddress(true);
                              }
                            }}
                          placeholder={
                            selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex] && !useNewBillingAddress
                              ? formatAddressAsString(buyerProfile.billingAddress[selectedBillingAddressIndex])
                              : "Enter full billing address"
                          }
                            disabled={!useNewBillingAddress}
                          required
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                        />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Products Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                          className="text-gray-600 dark:text-gray-300"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="3" y1="9" x2="21" y2="9"></line>
                          <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Products ({newEnquirySelectedProductIds.length + customProductRows.length})
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewEnquiryProductModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                          </svg>
                          Pull from cart
                        </button>
                          <button
                            type="button"
                          onClick={handleAddCustomRows}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
                          Add Rows
                          </button>
                        </div>
                    </div>

                    {/* Added Products Ribbons */}
                    {(() => {
                      const addedProducts = newEnquirySelectedProductIds.filter((productId) => {
                        const details = productDetails[productId];
                        return details?.isAdded === true; // Only show products explicitly added via "Add" button
                      });
                      const addedCustomProducts = customProductRows.filter((row) => {
                        return row.isAdded === true; // Only show custom products explicitly added via "Add" button
                      });
                      const hasAddedProducts = addedProducts.length > 0 || addedCustomProducts.length > 0;
                      if (!hasAddedProducts) return null;
                      return (
                        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600 mb-4">
                          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Added Products</h3>
                          <div className="space-y-2">
                            {addedProducts.map((productId) => {
                              const product = productSheetItems.find((p) => p._id === productId);
                              if (!product) return null;
                              const details = productDetails[productId];
                              if (!details) return null;
                              return (
                                <div
                                  key={productId}
                                  className="w-full bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-600 dark:border-teal-400 rounded-r-lg p-3 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400 flex-shrink-0">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      <span className="font-medium text-teal-900 dark:text-teal-100 text-sm">
                                        {product.displayName || product.category || 'Unnamed Product'}
                                      </span>
                                    <div className="flex items-center gap-3 text-xs text-teal-700 dark:text-teal-300">
                                      {details.quantity && <span>Qty: {details.quantity}</span>}
                                      {details.unit && <span>Unit: {details.unit}</span>}
                                      {details.targetPrice && <span>Price: {details.targetPrice}</span>}
                                    </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSelectedProduct(productId)}
                                    className="p-1.5 text-teal-600 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded transition-colors ml-2 flex-shrink-0"
                                      aria-label="Remove product"
                                      title="Remove product"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                </div>
                              );
                            })}
                            {addedCustomProducts.map((row) => {
                              return (
                                <div
                                  key={row.id}
                                  className="w-full bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-600 dark:border-teal-400 rounded-r-lg p-3 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400 flex-shrink-0">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                      <span className="font-medium text-teal-900 dark:text-teal-100 text-sm">
                                        {row.name || 'Custom Product'}
                                      </span>
                                    <div className="flex items-center gap-3 text-xs text-teal-700 dark:text-teal-300">
                                      {row.quantity && <span>Qty: {row.quantity}</span>}
                                      {row.unit && <span>Unit: {row.unit}</span>}
                                      {row.targetPrice && <span>Price: {row.targetPrice}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomRow(row.id)}
                                    className="p-1.5 text-teal-600 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded transition-colors ml-2 flex-shrink-0"
                                    aria-label="Remove product"
                                    title="Remove product"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Products List or Empty State */}
                    {(() => {
                      // Filter out added products from the list (only show products not in ribbon)
                      const incompleteProducts = newEnquirySelectedProductIds.filter((productId) => {
                        const details = productDetails[productId];
                        return details?.isAdded !== true; // Show products that are not added to ribbon
                      });
                      const incompleteCustomProducts = customProductRows.filter((row) => {
                        return row.isAdded !== true; // Show custom products that are not added to ribbon
                      });
                      const hasIncompleteProducts = incompleteProducts.length > 0 || incompleteCustomProducts.length > 0;
                      
                      if (!hasIncompleteProducts) {
                        if (newEnquirySelectedProductIds.length === 0 && customProductRows.length === 0) {
                          return (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50">
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
                          );
                        }
                        return null;
                      }
                      
                      return (
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
                          <div className="overflow-y-auto overflow-x-auto flex-1">
                            <table className="w-full border-collapse bg-white dark:bg-gray-800">
                              {/* Table Header */}
                              <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                                    Name
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600" style={{ width: '100px', minWidth: '100px', maxWidth: '120px' }}>
                                    Quantity
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                                    Unit
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600" style={{ width: '120px', minWidth: '120px', maxWidth: '140px' }}>
                                    Target Price
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              {/* Table Body */}
                              <tbody>
                                {/* Selected Products from Product Sheet */}
                                {incompleteProducts.map((productId, index) => {
                                  const product = productSheetItems.find((p) => p._id === productId);
                                  if (!product) return null;
                                  return (
                                    <tr
                                      key={productId}
                                      className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                                      }`}
                                    >
                                      {/* Name Column */}
                                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {product.displayName || product.category || 'Unnamed Product'}
                                            </p>
                                            {/* {product.category && (
                                              <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                                            )} */}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {/* Detail Icon */}
                                            <button
                                              type="button"
                                              onClick={() => handleToggleProductDetails(productId)}
                                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10 rounded transition-colors"
                                              aria-label="View details"
                                              title="View details"
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
                                                <line x1="10" y1="9" x2="8" y2="9"></line>
                                              </svg>
                                            </button>
                                            {/* Remove Icon */}
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveSelectedProduct(productId)}
                                              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded transition-colors"
                                              aria-label="Remove product"
                                              title="Remove product"
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
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                              </svg>
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                      {/* Quantity Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600" style={{ width: '100px', minWidth: '100px', maxWidth: '120px' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={productDetails[productId]?.quantity || ''}
                                          onChange={(e) => handleProductDetailChange(productId, 'quantity', parseFloat(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        />
                                      </td>
                                      {/* Unit Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                                        <select
                                          value={productDetails[productId]?.unit || ''}
                                          onChange={(e) => handleProductDetailChange(productId, 'unit', e.target.value)}
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        >
                                          <option value="">Select unit</option>
                                          {STANDARD_UNITS.map((unit) => (
                                            <option key={unit} value={unit}>
                                              {unit}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      {/* Target Price Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600" style={{ width: '120px', minWidth: '120px', maxWidth: '140px' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={productDetails[productId]?.targetPrice || ''}
                                          onChange={(e) => handleProductDetailChange(productId, 'targetPrice', parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        />
                                      </td>
                                      {/* Action Column - Add Button */}
                                      <td className="px-4 py-3">
                                        <button
                                          type="button"
                                          onClick={() => handleAddProductToRibbon(productId)}
                                          className="px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-400/10 hover:bg-teal-100 dark:hover:bg-teal-400/20 border border-teal-200 dark:border-teal-700 rounded-lg transition-colors flex items-center gap-1"
                                          title="Add to ribbon"
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
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                          </svg>
                                          Add
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Custom Product Rows - Only incomplete products */}
                                {incompleteCustomProducts.map((row, index) => {
                                  const totalIndex = incompleteProducts.length + index;
                                  return (
                                    <tr
                                      key={row.id}
                                      className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${totalIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                                      }`}
                                    >
                                      {/* Name Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                                        <div className="flex-1 relative">
                                          <input
                                            type="text"
                                            value={row.name}
                                            onChange={(e) => handleCustomProductChange(row.id, 'name', e.target.value)}
                                            placeholder="Enter product name"
                                            className="w-full px-2 py-1.5 pr-16 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                          />
                                          {/* AI Icon inside input */}
                                            <button
                                              type="button"
                                              onClick={() => handleOpenAIForCustomProduct(row.id)}
                                            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 hover:bg-pink-50 dark:hover:bg-pink-400/10 rounded transition-colors"
                                              aria-label="Generate with AI"
                                              title="Generate with AI"
                                            >
                                              <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                              stroke="url(#pinkTealGradientProductSheet)"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                              <defs>
                                                <linearGradient id="pinkTealGradientProductSheet" x1="0%" y1="0%" x2="100%" y2="100%">
                                                  <stop offset="0%" stopColor="#f472b6" />
                                                  <stop offset="100%" stopColor="#5eead4" />
                                                </linearGradient>
                                              </defs>
                                                <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                              </svg>
                                            </button>
                                          {/* View Icon inside input */}
                                            <button
                                              type="button"
                                              onClick={() => handleViewProductSpecifications(undefined, row.id)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-400/10 rounded transition-colors"
                                              aria-label="View details"
                                              title="View details"
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
                                              <line x1="10" y1="9" x2="8" y2="9"></line>
                                              </svg>
                                            </button>
                                        </div>
                                      </td>
                                      {/* Quantity Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600" style={{ width: '100px', minWidth: '100px', maxWidth: '120px' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={row.quantity || ''}
                                          onChange={(e) => handleCustomProductChange(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        />
                                      </td>
                                      {/* Unit Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                                        <select
                                          value={row.unit || ''}
                                          onChange={(e) => handleCustomProductChange(row.id, 'unit', e.target.value)}
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        >
                                          <option value="">Select unit</option>
                                          {STANDARD_UNITS.map((unit) => (
                                            <option key={unit} value={unit}>
                                              {unit}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      {/* Target Price Column */}
                                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600" style={{ width: '120px', minWidth: '120px', maxWidth: '140px' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={row.targetPrice || ''}
                                          onChange={(e) => handleCustomProductChange(row.id, 'targetPrice', parseFloat(e.target.value) || 0)}
                                          placeholder="0.00"
                                          className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                        />
                                      </td>
                                      {/* Action Column - Add and Delete Buttons */}
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleAddCustomProductToRibbon(row.id)}
                                          className="px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-400/10 hover:bg-teal-100 dark:hover:bg-teal-400/20 border border-teal-200 dark:border-teal-700 rounded-lg transition-colors flex items-center gap-1"
                                          title="Add to ribbon"
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
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                          </svg>
                                          Add
                                        </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveCustomRow(row.id)}
                                            className="p-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 hover:bg-red-100 dark:hover:bg-red-400/20 border border-red-200 dark:border-red-700 rounded-lg transition-colors"
                                            title="Delete"
                                            aria-label="Delete"
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
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Enquiry Notes Section */}
                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                        className="text-gray-500 dark:text-gray-400"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <label className="block font-medium text-gray-700 dark:text-gray-300">
                        Enquiry Notes
                      </label>
                    </div>
                    <textarea
                      value={enquiryNotes}
                      onChange={(e) => setEnquiryNotes(e.target.value)}
                      placeholder="Add any additional notes or requirements..."
                      rows={4}
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none"
                    />
                  </div>

                  {/* Attachment Section */}
                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                        className="text-gray-500 dark:text-gray-400"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <label className="block font-medium text-gray-700 dark:text-gray-300">
                        Attachment
                      </label>
                    </div>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        // Fire and forget; handler manages state and errors
                        void handleEnquiryAttachmentChange(file);
                      }}
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900 dark:file:text-teal-200"
                    />
                    {enquiryAttachment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Selected: {enquiryAttachment.name}
                      </p>
                    )}
                    {enquiryAttachmentUrl && !enquiryAttachment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Current attachment exists
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={handleResetEnquiryForm}
                        className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Clear Form
                      </button>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleCloseNewEnquiryModal}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg transition-colors"
                      >
                        {isSubmitting ? 'Creating...' : 'Create Enquiry'}
                      </button>
                    </div>
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
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
                  className="text-gray-600 dark:text-gray-400"
                >
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select from Product Sheet</h3>
              </div>
              <button
                onClick={handleCloseNewEnquiryProductModal}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products by name or specifications..."
                  value={newEnquiryProductSearchQuery}
                  onChange={(e) => setNewEnquiryProductSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Modal Body - Product Table */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {(() => {
                // Filter products based on search query
                const filteredProducts = productSheetItems.filter((product) => {
                  if (!newEnquiryProductSearchQuery.trim()) return true;
                  
                  const searchLower = newEnquiryProductSearchQuery.toLowerCase();
                  const productName = (product.displayName || '').toLowerCase();
                  
                  // Check if product name matches
                  if (productName.includes(searchLower)) return true;
                  
                  // Check if any specification matches
                  if (product.userAttributes) {
                    for (const [key, value] of Object.entries(product.userAttributes)) {
                      if (value !== '' && value !== 0 && value !== null) {
                        const keyLower = key.toLowerCase();
                        const valueStr = Array.isArray(value) ? value.join(', ') : String(value);
                        if (keyLower.includes(searchLower) || valueStr.toLowerCase().includes(searchLower)) {
                          return true;
                        }
                      }
                    }
                  }
                  
                  return false;
                });

                return filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto mb-4 text-gray-400"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <p className="text-lg font-medium mb-1">
                      {productSheetItems.length === 0 ? 'No products available' : 'No products found'}
                    </p>
                    <p className="text-sm">
                      {productSheetItems.length === 0 ? 'Add products to your product sheet first' : 'Try adjusting your search query'}
                    </p>
                </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Product Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Specifications</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredProducts.map((product) => {
                    const isSelected = newEnquirySelectedProductIds.includes(product._id || '');
                        const specifications: string[] = [];
                        if (product.userAttributes) {
                          Object.entries(product.userAttributes).forEach(([key, value]) => {
                            if (value !== '' && value !== 0 && value !== null) {
                              // Exclude image fields from specifications
                              const lowerKey = key.toLowerCase();
                              if (!lowerKey.includes('image') && !lowerKey.includes('attachment')) {
                                if (Array.isArray(value)) {
                                  specifications.push(`${key}: ${value.join(', ')}`);
                                } else {
                                  specifications.push(`${key}: ${value}`);
                                }
                              }
                            }
                          });
                        }
                    return (
                          <tr
                        key={product._id}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                          >
                            {/* Product Name */}
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {product.displayName || 'Unnamed Product'}
                          </div>
                            </td>

                            {/* Specifications */}
                            <td className="px-4 py-3">
                              {specifications.length > 0 ? (
                                <div className="max-w-md">
                                  <div className="flex flex-wrap gap-1">
                                    {specifications.slice(0, 3).map((spec, index) => (
                                      <span
                                        key={index}
                                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded truncate max-w-[150px]"
                                        title={spec}
                                      >
                                        {spec}
                                      </span>
                                    ))}
                                    {specifications.length > 3 && (
                                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                        +{specifications.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                              )}
                            </td>

                            {/* Add Button */}
                            <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleNewEnquiryProductSelection(product._id || '')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${isSelected
                                  ? 'bg-teal-700 dark:bg-teal-800 text-teal-400 dark:text-teal-300 border-teal-400 dark:border-teal-500 hover:bg-teal-600 dark:hover:bg-teal-700'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            {isSelected ? 'Added' : '+ Add'}
                          </button>
                            </td>
                          </tr>
                    );
                  })}
                      </tbody>
                    </table>
                </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="button"
                onClick={handleDoneNewEnquiryProductSelection}
                className="px-6 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
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
                  className="text-gray-600 dark:text-gray-400"
                >
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Product with AI</h3>
              </div>
              <button
                onClick={handleCloseGenerateProductModal}
                className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter product keyword
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productKeyword}
                      onChange={(e) => setProductKeyword(e.target.value)}
                      placeholder="e.g., laptop, office chair, printer"
                      className="flex-1 px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-teal-300 dark:border-teal-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Enter a product type and AI will generate relevant specification fields
                  </p>
                </>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                  {/* Product Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {generatedFieldsForEnquiry.item}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">AI Generated</span>
                  </div>

                  {/* Generated Fields */}
                  <div className="space-y-4">
                    {generatedFieldsForEnquiry.fields.map((field, index) => (
                      <div key={index} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
                            className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={(specFormDataForEnquiry[field.label] as number) || ''}
                            onChange={(e) => handleSpecInputChangeForEnquiry(field.label, parseFloat(e.target.value) || 0)}
                            placeholder={field.placeholder || `e.g., 50`}
                            className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            required
                          />
                        ) : (
                          <input
                            type="text"
                            value={(specFormDataForEnquiry[field.label] as string) || ''}
                            onChange={(e) => handleSpecInputChangeForEnquiry(field.label, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
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
                    className="w-full px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseGenerateProductModal}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shipping Address Selection Modal */}
      {isShippingAddressModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsShippingAddressModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Shipping Address
              </h2>
              <button
                onClick={() => setIsShippingAddressModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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

            <div className="p-6 space-y-4">
              {buyerProfile?.shippingAddress && buyerProfile.shippingAddress.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Select from saved addresses:
                  </label>
                  <div className="space-y-2">
                    {buyerProfile.shippingAddress.map((address, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="shippingAddressModal"
                          checked={selectedShippingAddressIndex === index && !useNewShippingAddress}
                          onChange={() => {
                            setSelectedShippingAddressIndex(index);
                            setUseNewShippingAddress(false);
                            setShippingAddress({
                              addressLine1: address.addressLine1 || '',
                              addressLine2: address.addressLine2 || '',
                              city: address.city || '',
                              state: address.state || '',
                              zipCode: address.zipCode || '',
                              country: address.country || '',
                              phone: (address as any).phone || '',
                              email: (address as any).email || '',
                            });
                            setIsShippingAddressModalOpen(false);
                          }}
                          className="mt-1 w-4 h-4 text-teal-500 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {address.city}, {address.state} {address.zipCode}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{address.country}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No saved shipping addresses found.
                </p>
              )}
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="shippingAddressModal"
                    checked={useNewShippingAddress}
                    onChange={() => {
                      setIsShippingAddressModalOpen(false);
                      router.push('/profile#shipping-address');
                    }}
                    className="w-4 h-4 text-teal-500 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Use new address</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Address Selection Modal */}
      {isBillingAddressModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsBillingAddressModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Billing Address
              </h2>
              <button
                onClick={() => setIsBillingAddressModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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

            <div className="p-6 space-y-4">
              {buyerProfile?.billingAddress && buyerProfile.billingAddress.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                    Select from saved addresses:
                  </label>
                  <div className="space-y-2">
                    {buyerProfile.billingAddress.map((address, index) => (
                      <label
                        key={index}
                        className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name="billingAddressModal"
                          checked={selectedBillingAddressIndex === index && !useNewBillingAddress}
                          onChange={() => {
                            setSelectedBillingAddressIndex(index);
                            setUseNewBillingAddress(false);
                            setBillingAddress({
                              addressLine1: address.addressLine1 || '',
                              addressLine2: address.addressLine2 || '',
                              city: address.city || '',
                              state: address.state || '',
                              zipCode: address.zipCode || '',
                              country: address.country || '',
                              phone: (address as any).phone || '',
                              email: (address as any).email || '',
                            });
                            setIsBillingAddressModalOpen(false);
                          }}
                          className="mt-1 w-4 h-4 text-teal-500 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {address.addressLine1}
                            {address.addressLine2 && `, ${address.addressLine2}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {address.city}, {address.state} {address.zipCode}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{address.country}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No saved billing addresses found.
                </p>
              )}
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="billingAddressModal"
                    checked={useNewBillingAddress}
                    onChange={() => {
                      setIsBillingAddressModalOpen(false);
                      router.push('/profile#billing-address');
                    }}
                    className="w-4 h-4 text-teal-500 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Use new address</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List AI Generation Modal */}
      {isProductListAIModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseProductListAIModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-500"
                >
                  <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Generated Description
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {productListAIProductName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseProductListAIModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isGeneratingProductListAI ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Generating specifications...</p>
                </div>
              ) : productListAIGeneratedFields ? (
                <div className="space-y-4">
                  <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-teal-800 dark:text-teal-200">
                      <strong>Product:</strong> {productListAIGeneratedFields.item || productListAIProductName}
                    </p>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {productListAIGeneratedFields.fields.map((field, index) => (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {field.label}
                          {field.type !== 'textarea' && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                        </label>
                        {field.type === 'dropdown' && field.options ? (
                          <CreatableSelect
                            value={(productListAISpecFormData[field.label] as string[]) || []}
                            onChange={(value) => handleProductListAISpecInputChange(field.label, value)}
                            options={field.options}
                            placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                            required
                            className="w-full"
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={(productListAISpecFormData[field.label] as string) || ''}
                            onChange={(e) => handleProductListAISpecInputChange(field.label, e.target.value)}
                            placeholder={field.placeholder || `e.g., Specific requirements...`}
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={(productListAISpecFormData[field.label] as number) || ''}
                            onChange={(e) => handleProductListAISpecInputChange(field.label, parseFloat(e.target.value) || 0)}
                            placeholder={field.placeholder || `e.g., 50`}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required
                          />
                        ) : (
                          <CreatableSelect
                            value={
                              Array.isArray(productListAISpecFormData[field.label])
                                ? (productListAISpecFormData[field.label] as string[])
                                : productListAISpecFormData[field.label]
                                ? String(productListAISpecFormData[field.label])
                                    .split(',')
                                    .map((v) => v.trim())
                                    .filter((v) => v.length > 0)
                                : []
                            }
                            onChange={(value) => handleProductListAISpecInputChange(field.label, value)}
                            options={[]}
                            placeholder={field.placeholder || `Type and press Enter to add ${field.label.toLowerCase()}`}
                            required
                            className="w-full"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No description generated yet.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={handleCloseProductListAIModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProductSpecifications}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-700 rounded-lg transition-colors"
              >
                Save Description
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Specifications Modal */}
      {isViewSpecModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsViewSpecModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-500"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Product Description
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {viewSpecProductId 
                      ? (productSheetItems.find(p => p._id === viewSpecProductId)?.displayName || 'Product')
                      : (viewSpecRowId 
                          ? (customProductRows.find(r => r.id === viewSpecRowId)?.name || 'Custom Product')
                          : 'Product')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewSpecModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {(() => {
                // Get specifications from local state first
                let specs = viewSpecProductId 
                  ? productSpecifications[viewSpecProductId]
                  : viewSpecRowId
                  ? customProductSpecifications[viewSpecRowId]
                  : null;

                // If no local specs and it's a product, try to get from product's userAttributes
                if (!specs && viewSpecProductId) {
                  const product = productSheetItems.find(p => p._id === viewSpecProductId);
                  if (product && product.userAttributes) {
                    // Convert userAttributes to the same format as saved specs
                    specs = {};
                    Object.entries(product.userAttributes).forEach(([key, value]) => {
                      if (value !== '' && value !== 0 && value !== null && value !== undefined) {
                        if (Array.isArray(value) && value.length === 0) {
                          return;
                        }
                        specs[key] = value;
                      }
                    });
                  }
                }

                if (!specs || Object.keys(specs).length === 0) {
                  return (
                    <div className="text-center py-12">
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400 mx-auto mb-4"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">No description added yet</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        Click the AI icon to generate and add description
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-4 gap-4">
                    {Object.entries(specs).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 h-32">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 truncate">
                          {key}
                        </label>
                        <div className="text-sm text-gray-900 dark:text-gray-100 overflow-y-auto h-20">
                          {Array.isArray(value) ? (
                            value.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {value.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 text-xs font-medium"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>
                            )
                          ) : value !== '' && value !== 0 && value !== null && value !== undefined ? (
                            <span className="break-words">{String(value)}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">Not specified</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsViewSpecModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description Modal */}
      {isDescriptionModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsDescriptionModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Description
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {descriptionModalProductName}
                </p>
              </div>
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {descriptionModalContent || <span className="text-gray-400 dark:text-gray-500 italic">No description</span>}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsDescriptionModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </>
  );
}
