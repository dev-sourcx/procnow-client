'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredProducts, BriefProduct } from '@/lib/storage';
import { requireAuth } from '@/lib/auth';
import { getAuthToken } from '@/lib/storage';
import {
  getProductSheet,
  ProductSheetItem,
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  deleteEnquiry,
  type Enquiry as ApiEnquiry,
  generateFieldsFromKeyword,
  type GeneratedFieldsResponse,
  type GeneratedField,
  addProductItem,
  getBuyerQuotes,
  type Quote,
  uploadFile,
  getBuyerProfile,
  type BuyerProfile,
} from '@/lib/api';
import { showToast } from '@/lib/toast';
import DashboardLayout from '@/components/DashboardLayout';
import CreatableSelect from '@/components/CreatableSelect';
import EnquiryTabs from '@/components/EnquiryTabs';

interface EnquiryProduct {
  productId: string;
  quantity: number;
  deliveryDate: string;
  targetPrice: number;
  unit?: string;
}

// Standard units for dropdown
const STANDARD_UNITS = [
  'pcs', 'kg', 'g', 'mg', 'ton', 'lb', 'oz',
  'm', 'cm', 'mm', 'km', 'ft', 'in', 'yd',
  'L', 'mL', 'gal', 'fl oz',
  'm²', 'cm²', 'ft²', 'in²',
  'm³', 'cm³', 'ft³', 'in³',
  'box', 'pack', 'set', 'pair', 'dozen', 'roll', 'sheet', 'unit'
];

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<ApiEnquiry[]>([]);
  const [productSheetItems, setProductSheetItems] = useState<ProductSheetItem[]>([]);
  const [expandedEnquiries, setExpandedEnquiries] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedEnquiryForSubmit, setSelectedEnquiryForSubmit] = useState<string | null>(null);
  const [isNewEnquiryModalOpen, setIsNewEnquiryModalOpen] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  // Simplified address fields: single text input for shipping and billing
  const [shippingAddress, setShippingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  const [billingAddress, setBillingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [enquiryStatus, setEnquiryStatus] = useState('draft');
  const [enquiryNotes, setEnquiryNotes] = useState('');
  // Buyer profile addresses
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [selectedShippingAddressIndex, setSelectedShippingAddressIndex] = useState<number | null>(null);
  const [selectedBillingAddressIndex, setSelectedBillingAddressIndex] = useState<number | null>(null);
  const [useNewShippingAddress, setUseNewShippingAddress] = useState(false);
  const [useNewBillingAddress, setUseNewBillingAddress] = useState(false);
  // Address selection modals
  const [isShippingAddressModalOpen, setIsShippingAddressModalOpen] = useState(false);
  const [isBillingAddressModalOpen, setIsBillingAddressModalOpen] = useState(false);
  // Inline product generation for sidebar
  const [inlineProductKeyword, setInlineProductKeyword] = useState('');
  const [isGeneratingInline, setIsGeneratingInline] = useState(false);
  const [inlineGeneratedFields, setInlineGeneratedFields] = useState<GeneratedFieldsResponse | null>(null);
  const [inlineSpecFormData, setInlineSpecFormData] = useState<Record<string, any>>({});
  const [inlineTextInputValues, setInlineTextInputValues] = useState<Record<string, string>>({});
  const [enquiryAttachment, setEnquiryAttachment] = useState<File | null>(null);
  const [enquiryAttachmentUrl, setEnquiryAttachmentUrl] = useState<string>('');
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEnquiryForDetail, setSelectedEnquiryForDetail] = useState<string | null>(null);
  // Product view modal for Quote Requested tab
  const [isProductViewModalOpen, setIsProductViewModalOpen] = useState(false);
  const [selectedEnquiryForProductView, setSelectedEnquiryForProductView] = useState<string | null>(null);
  // Edit enquiry form state
  const [editEnquiryName, setEditEnquiryName] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  const [editBillingAddress, setEditBillingAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  const [editExpectedDeliveryDate, setEditExpectedDeliveryDate] = useState('');
  const [editEnquiryStatus, setEditEnquiryStatus] = useState('draft');
  const [editEnquiryNotes, setEditEnquiryNotes] = useState('');
  const [editEnquiryAttachment, setEditEnquiryAttachment] = useState<File | null>(null);
  const [editEnquiryAttachmentUrl, setEditEnquiryAttachmentUrl] = useState<string>('');
  const [isUpdatingEnquiry, setIsUpdatingEnquiry] = useState(false);
  const [editEnquirySelectedProductIds, setEditEnquirySelectedProductIds] = useState<string[]>([]);
  const [isEditEnquiryProductModalOpen, setIsEditEnquiryProductModalOpen] = useState(false);
  // Product details state: maps productId to { quantity, targetPrice, unit }
  const [productDetails, setProductDetails] = useState<Record<string, { quantity: number; targetPrice: number; unit: string }>>({});
  // Track which product details are expanded (collapsible)
  const [expandedProductDetails, setExpandedProductDetails] = useState<Set<string>>(new Set());
  // Custom product rows (for manual entry)
  const [customProductRows, setCustomProductRows] = useState<Array<{ id: string; name: string; quantity: number; unit: string; targetPrice: number }>>([]);
  // Submit mode state - tracks if we're submitting an existing enquiry vs creating new
  const [isSubmitMode, setIsSubmitMode] = useState(false);
  const [enquiryIdForSubmit, setEnquiryIdForSubmit] = useState<string | null>(null);
  // Tab state for filtering enquiries
  const [activeTab, setActiveTab] = useState<'draft' | 'sentToAdmin' | 'vendorAssigned'>('draft');
  // Quotes state for vendor assigned tab
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Attachment handlers - upload to S3 and store URL
  const handleEnquiryAttachmentChange = async (file: File | null) => {
    if (!file) {
      setEnquiryAttachment(null);
      setEnquiryAttachmentUrl('');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast({
        type: 'error',
        message: 'Please log in to upload attachments.',
      });
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

  const handleEditEnquiryAttachmentChange = async (file: File | null) => {
    if (!file) {
      setEditEnquiryAttachment(null);
      setEditEnquiryAttachmentUrl('');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast({
        type: 'error',
        message: 'Please log in to upload attachments.',
      });
      setEditEnquiryAttachment(null);
      setEditEnquiryAttachmentUrl('');
      return;
    }

    try {
      setEditEnquiryAttachment(file);
      const { url } = await uploadFile(token, file, 'buyer-enquiry-attachments');
      setEditEnquiryAttachmentUrl(url);
    } catch (error: any) {
      console.error('Error uploading enquiry attachment to S3 (edit):', error);
      showToast({
        type: 'error',
        message: error?.message || 'Failed to upload attachment. Please try again.',
      });
      setEditEnquiryAttachment(null);
      setEditEnquiryAttachmentUrl('');
    }
  };

  // Helper: get set of enquiry IDs that have at least one visible quote
  const getEnquiryIdsWithQuotes = (): Set<string> => {
    return new Set(
      quotes
        .map((quote) => {
          const assignment = quote.vendorAssignmentId as any;
          const enquiryProduct = assignment?.enquiryProductId as any;
          const quoteEnquiryId =
            enquiryProduct?.enquiryId?._id?.toString() ||
            enquiryProduct?.enquiryId?.toString() ||
            enquiryProduct?.enquiryId;
          return quoteEnquiryId as string | undefined;
        })
        .filter((id): id is string => !!id)
    );
  };

  // Helper function to filter enquiries based on active tab
  const getFilteredEnquiries = (): ApiEnquiry[] => {
    if (activeTab === 'draft') {
      return enquiries.filter((e) => e.enquiryStatus === 'draft');
    } else if (activeTab === 'sentToAdmin') {
      return enquiries.filter((e) => e.enquiryStatus === 'submitted');
    } else if (activeTab === 'vendorAssigned') {
      const enquiryIdsWithQuotes = getEnquiryIdsWithQuotes();
      return enquiries.filter(
        (e) => e.enquiryStatus === 'submitted' && enquiryIdsWithQuotes.has(e._id || '')
      );
    }
    return enquiries;
  };

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

  const loadQuotes = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setQuotes([]);
        return;
      }

      setQuotesLoading(true);
      const fetchedQuotes = await getBuyerQuotes(token);
      // Only keep quotes that are visible to the client (sent by admin)
      const visibleQuotes = fetchedQuotes.filter((quote) => quote.visibletoClient);
      setQuotes(visibleQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
      setQuotes([]);
    } finally {
      setQuotesLoading(false);
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

      // Check authentication first - redirect if not logged in
      if (!requireAuth()) {
        return;
      }

      // Load data
      await Promise.all([loadEnquiries(), loadProducts(), loadQuotes()]);
    };

    initialize();
  }, []);


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
      showToast({ type: 'error', message: error.message || 'Failed to delete enquiry. Please try again.' });
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
      showToast({ type: 'error', message: 'Please add at least one product to the enquiry before submitting.' });
      setOpenMenuId(null);
      return;
    }

    // Pre-populate all form fields with enquiry data
    setEnquiryName(enquiry.enquiryName || '');
    
    // Pre-fill shipping address
    if (enquiry.shippingAddress) {
      const addr = enquiry.shippingAddress;
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
          });
        } catch {
          setShippingAddress({
            addressLine1: addr || '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
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
      });
    }

    // Pre-fill billing address
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
          });
        } catch {
          setBillingAddress({
            addressLine1: addr || '',
            addressLine2: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
          });
        }
      } else {
        setBillingAddress({
          addressLine1: (addr as any).addressLine1 || '',
          addressLine2: (addr as any).addressLine2 || '',
          city: (addr as any).city || '',
          state: (addr as any).state || '',
          zipCode: (addr as any).zipCode || '',
          country: (addr as any).country || '',
        });
      }
    } else {
      setBillingAddress({
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      });
    }

    // Pre-fill expected delivery date
    if (enquiry.expectedDeliveryDate) {
      const date = new Date(enquiry.expectedDeliveryDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setExpectedDeliveryDate(`${year}-${month}-${day}`);
    } else {
      setExpectedDeliveryDate('');
    }

    // Pre-fill enquiry notes
    setEnquiryNotes(enquiry.enquiryNotes || '');
    
    // Pre-fill attachment
    if (enquiry.attachment) {
      setEnquiryAttachmentUrl(enquiry.attachment);
    } else {
      setEnquiryAttachmentUrl('');
      setEnquiryAttachment(null);
    }

    // Pre-fill selected product IDs
    const productIds = enquiry.enquiryProducts?.map((ep: any) => 
      typeof ep === 'string' ? ep : ep.productId || ep._id
    ) || [];
    setNewEnquirySelectedProductIds(productIds);

    // Set submit mode and enquiry ID
    setIsSubmitMode(true);
    setEnquiryIdForSubmit(enquiryId);
    
    // Open the sidebar form (same as create enquiry)
    setIsNewEnquiryModalOpen(true);
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
    });
    setBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
  };

  // Helper function to format address as comma-separated string
  const formatAddressAsString = (address: { addressLine1?: string; addressLine2?: string; city?: string; state?: string; zipCode?: string; country?: string }): string => {
    const parts = [];
    if (address.addressLine1) parts.push(address.addressLine1);
    if (address.addressLine2) parts.push(address.addressLine2);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    if (address.country) parts.push(address.country);
    return parts.join(', ');
  };

  const handleShippingAddressChange = (field: string, value: string) => {
    setShippingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Get formatted shipping address string for display
  const getShippingAddressString = (): string => {
    if (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex] && !useNewShippingAddress) {
      return formatAddressAsString(buyerProfile.shippingAddress[selectedShippingAddressIndex]);
    }
    return formatAddressAsString(shippingAddress);
  };

  // Get formatted billing address string for display
  const getBillingAddressString = (): string => {
    if (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex] && !useNewBillingAddress) {
      return formatAddressAsString(buyerProfile.billingAddress[selectedBillingAddressIndex]);
    }
    return formatAddressAsString(billingAddress);
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

    // Validate required fields - check if saved address selected or new address entered
    const hasShippingAddress = (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) 
      || shippingAddress.addressLine1.trim();
    const hasBillingAddress = (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex])
      || billingAddress.addressLine1.trim();

    if (!hasShippingAddress) {
      showToast({ type: 'error', message: 'Please enter a shipping address.' });
      return;
    }

    if (!hasBillingAddress) {
      showToast({ type: 'error', message: 'Please enter a billing address.' });
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
      // Use selected address from buyer profile if selected, otherwise use entered address
      let finalShippingAddress;
      if (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) {
        // Use the complete address object from buyer profile
        finalShippingAddress = buyerProfile.shippingAddress[selectedShippingAddressIndex];
      } else {
        // If user entered a new address, use the shippingAddress state which may have been updated from input
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
      if (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex]) {
        // Use the complete address object from buyer profile
        finalBillingAddress = buyerProfile.billingAddress[selectedBillingAddressIndex];
      } else {
        // If user entered a new address, use the billingAddress state which may have been updated from input
        finalBillingAddress = {
          addressLine1: billingAddress.addressLine1.trim() || '',
          addressLine2: billingAddress.addressLine2?.trim() || undefined,
          city: billingAddress.city?.trim() || billingAddress.addressLine1.trim(),
          state: billingAddress.state?.trim() || billingAddress.addressLine1.trim(),
          zipCode: billingAddress.zipCode?.trim() || billingAddress.addressLine1.trim(),
          country: billingAddress.country?.trim() || billingAddress.addressLine1.trim(),
        };
      }

      await updateEnquiry(token, selectedEnquiryForSubmit, {
        shippingAddress: finalShippingAddress,
        billingAddress: finalBillingAddress,
        enquiryStatus: 'submitted',
        attachment: enquiryAttachmentUrl || undefined,
      });

      await loadEnquiries();
    
    // Show success message
      const enquiryProducts = enquiry.enquiryProducts || [];
      showToast({
        type: 'success',
        message: `Enquiry "${enquiry.enquiryName}" has been submitted successfully with ${enquiryProducts.length} product(s).`,
      });
    
    handleCloseSubmitModal();
    } catch (error: any) {
      console.error('Error submitting enquiry:', error);
      showToast({ type: 'error', message: error.message || 'Failed to submit enquiry. Please try again.' });
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

  const loadBuyerProfile = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const profile = await getBuyerProfile(token);
      setBuyerProfile(profile);
    } catch (error) {
      console.error('Error loading buyer profile:', error);
    }
  };

  const handleCreateEnquiry = async () => {
    // Require authentication before creating enquiry
    if (!requireAuth()) {
      return;
    }

    // Reset submit mode
    setIsSubmitMode(false);
    setEnquiryIdForSubmit(null);

    // Load buyer profile to get addresses
    await loadBuyerProfile();

    setIsNewEnquiryModalOpen(true);
    setEnquiryName('');
    setShippingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setExpectedDeliveryDate('');
    setEnquiryStatus('draft');
    setEnquiryNotes('');
    setEnquiryAttachment(null);
    setSelectedShippingAddressIndex(null);
    setSelectedBillingAddressIndex(null);
    setUseNewShippingAddress(false);
    setUseNewBillingAddress(false);
    setEnquiryAttachmentUrl('');
    setSelectedProductIds([]);
    setNewEnquirySelectedProductIds([]);
    setCustomProductRows([]);
    setInlineProductKeyword('');
    setInlineGeneratedFields(null);
    setInlineSpecFormData({});
  };

  const handleCloseNewEnquiryModal = () => {
    setIsNewEnquiryModalOpen(false);
    setIsSubmitMode(false);
    setEnquiryIdForSubmit(null);
    setEnquiryName('');
    setShippingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setExpectedDeliveryDate('');
    setEnquiryStatus('draft');
    setEnquiryNotes('');
    setEnquiryAttachment(null);
    setEnquiryAttachmentUrl('');
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

  // Handle adding multiple values to text fields on Enter key (for modal)
  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldLabel: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      const currentValue = input.value.trim();
      
      if (currentValue) {
        const existingValue = specFormData[fieldLabel];
        let values: string[] = [];
        
        // If existing value is an array, use it; if string, convert to array; otherwise start fresh
        if (Array.isArray(existingValue)) {
          values = [...existingValue];
        } else if (typeof existingValue === 'string' && existingValue.trim()) {
          // Split by comma if it's a comma-separated string, otherwise treat as single value
          values = existingValue.includes(',') 
            ? existingValue.split(',').map(v => v.trim()).filter(v => v)
            : [existingValue.trim()];
        }
        
        // Add new value if it doesn't already exist
        if (!values.includes(currentValue)) {
          values.push(currentValue);
          handleSpecInputChange(fieldLabel, values);
        }
        
        // Clear the input field
        input.value = '';
      }
    }
  };

  // Remove a value from a multi-value text field (for modal)
  const handleRemoveValue = (fieldLabel: string, valueToRemove: string) => {
    const existingValue = specFormData[fieldLabel];
    if (Array.isArray(existingValue)) {
      const newValues = existingValue.filter(v => v !== valueToRemove);
      handleSpecInputChange(fieldLabel, newValues.length > 0 ? newValues : '');
    }
  };

  const handleProductDetailChange = (productId: string, field: 'quantity' | 'targetPrice' | 'unit', value: string | number) => {
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

  // Helper function to map product IDs to objects with details
  const mapProductIdsToEnquiryProducts = (productIds: string[]): string[] | { productId: string; quantity?: number; targetPrice?: number; unit?: string }[] => {
    const hasAnyDetails = productIds.some((productId) => {
      const details = productDetails[productId];
      return details && (details.quantity || details.targetPrice || details.unit);
    });
    
    if (!hasAnyDetails) {
      return productIds; // Return as string array if no details
    }
    
    // Return as object array with details
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
      return { productId }; // Return as object even if no details to maintain consistency
    });
  };

  // Helper function to combine selected products and custom products for enquiry
  const getAllEnquiryProducts = (): any => {
    const selectedProducts = newEnquirySelectedProductIds.length > 0 
      ? mapProductIdsToEnquiryProducts(newEnquirySelectedProductIds) 
      : [];
    
    const customProducts = customProductRows
      .filter((row) => row.name.trim()) // Only include rows with a name
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

  const handleInlineGenerateProduct = async () => {
    if (!inlineProductKeyword.trim()) {
      alert('Please enter a product keyword');
      return;
    }

    setIsGeneratingInline(true);
    try {
      // Call backend to generate fields from keyword
      const fields = await generateFieldsFromKeyword(inlineProductKeyword.trim());
      
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

  // Handle adding multiple values to text fields on Enter key
  const handleInlineTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldLabel: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.currentTarget;
      const currentValue = input.value.trim();
      
      if (currentValue) {
        const existingValue = inlineSpecFormData[fieldLabel];
        let values: string[] = [];
        
        // If existing value is an array, use it; if string, convert to array; otherwise start fresh
        if (Array.isArray(existingValue)) {
          values = [...existingValue];
        } else if (typeof existingValue === 'string' && existingValue.trim()) {
          // Split by comma if it's a comma-separated string, otherwise treat as single value
          values = existingValue.includes(',') 
            ? existingValue.split(',').map(v => v.trim()).filter(v => v)
            : [existingValue.trim()];
        }
        
        // Add new value if it doesn't already exist
        if (!values.includes(currentValue)) {
          values.push(currentValue);
          handleInlineSpecInputChange(fieldLabel, values);
        }
        
        // Clear the input field
        input.value = '';
      }
    }
  };


  // Remove a value from a multi-value text field
  const handleInlineRemoveValue = (fieldLabel: string, valueToRemove: string) => {
    const existingValue = inlineSpecFormData[fieldLabel];
    if (Array.isArray(existingValue)) {
      const newValues = existingValue.filter(v => v !== valueToRemove);
      handleInlineSpecInputChange(fieldLabel, newValues.length > 0 ? newValues : '');
    }
  };

  const handleAddInlineGeneratedProduct = async () => {
    if (!inlineGeneratedFields) return;

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
      Object.entries(inlineSpecFormData).forEach(([label, value]) => {
        if (value !== '' && value !== 0 && value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length === 0) {
            return; // Skip empty arrays
          }
          userAttributes[label] = value;
        }
      });

      // Create product item
      const newProduct = await addProductItem(token, {
        productSource: 'ai_generated',
        displayName: inlineGeneratedFields.item || inlineProductKeyword,
        category: inlineGeneratedFields.item || 'General',
        userAttributes: userAttributes,
        adminProductId: null,
        externalRef: null,
      });

      // Reload product sheet items
      await loadProducts();

      // Add to new enquiry products
      if (newProduct._id) {
        setNewEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
      }

      // Reset inline generation state
      setInlineProductKeyword('');
      setInlineGeneratedFields(null);
      setInlineSpecFormData({});
      alert('Product generated and added to enquiry successfully!');
    } catch (error: any) {
      console.error('Error adding generated product:', error);
      alert(error.message || 'Failed to add product. Please try again.');
    }
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

      // Add to selected products based on which modal is open
      if (newProduct._id) {
        if (isDetailModalOpen && selectedEnquiryForDetail) {
          // Add to edit enquiry products
          setEditEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
        } else {
          // Add to new enquiry products
        setNewEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
        }
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

    // Validate required address fields - check if saved address selected or new address entered
    const hasShippingAddress = (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) 
      || shippingAddress.addressLine1.trim();
    const hasBillingAddress = (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex])
      || billingAddress.addressLine1.trim();

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

      // Check if we're in submit mode (updating existing enquiry)
      if (isSubmitMode && enquiryIdForSubmit) {
        // Use selected address from buyer profile if selected, otherwise use entered address
        let finalShippingAddress;
        if (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) {
          // Use the complete address object from buyer profile
          finalShippingAddress = buyerProfile.shippingAddress[selectedShippingAddressIndex];
        } else {
          // If user entered a new address, use the shippingAddress state
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
        if (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex]) {
          // Use the complete address object from buyer profile
          finalBillingAddress = buyerProfile.billingAddress[selectedBillingAddressIndex];
        } else {
          // If user entered a new address, use the billingAddress state
          finalBillingAddress = {
            addressLine1: billingAddress.addressLine1.trim() || '',
            addressLine2: billingAddress.addressLine2?.trim() || undefined,
            city: billingAddress.city?.trim() || billingAddress.addressLine1.trim(),
            state: billingAddress.state?.trim() || billingAddress.addressLine1.trim(),
            zipCode: billingAddress.zipCode?.trim() || billingAddress.addressLine1.trim(),
            country: billingAddress.country?.trim() || billingAddress.addressLine1.trim(),
          };
        }

        // Update existing enquiry and change status to 'submitted'
        await updateEnquiry(token, enquiryIdForSubmit, {
          enquiryName: enquiryName.trim(),
          shippingAddress: finalShippingAddress,
          billingAddress: finalBillingAddress,
          expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
          enquiryStatus: 'submitted',
          enquiryNotes: enquiryNotes || undefined,
          attachment: enquiryAttachmentUrl || undefined,
          enquiryProducts: getAllEnquiryProducts() as any,
        });

        await loadEnquiries();
        const enquiry = enquiries.find((e) => e._id === enquiryIdForSubmit);
        const enquiryProducts = enquiry?.enquiryProducts || [];
        alert(`Enquiry "${enquiryName}" has been submitted successfully with ${enquiryProducts.length} product(s).`);
        handleCloseNewEnquiryModal();
      } else {
        // Create new enquiry
        // Use selected address from buyer profile if selected, otherwise use entered address
        let finalShippingAddressCreate;
        if (selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex]) {
          // Use the complete address object from buyer profile
          finalShippingAddressCreate = buyerProfile.shippingAddress[selectedShippingAddressIndex];
        } else {
          // If user entered a new address, use the shippingAddress state
          finalShippingAddressCreate = {
            addressLine1: shippingAddress.addressLine1.trim() || '',
            addressLine2: shippingAddress.addressLine2?.trim() || undefined,
            city: shippingAddress.city?.trim() || shippingAddress.addressLine1.trim(),
            state: shippingAddress.state?.trim() || shippingAddress.addressLine1.trim(),
            zipCode: shippingAddress.zipCode?.trim() || shippingAddress.addressLine1.trim(),
            country: shippingAddress.country?.trim() || shippingAddress.addressLine1.trim(),
          };
        }

        let finalBillingAddressCreate;
        if (selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex]) {
          // Use the complete address object from buyer profile
          finalBillingAddressCreate = buyerProfile.billingAddress[selectedBillingAddressIndex];
        } else {
          // If user entered a new address, use the billingAddress state
          finalBillingAddressCreate = {
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
          shippingAddress: finalShippingAddressCreate,
          billingAddress: finalBillingAddressCreate,
        expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
        enquiryStatus: enquiryStatus,
        enquiryNotes: enquiryNotes || undefined,
        attachment: enquiryAttachmentUrl || undefined,
        enquiryProducts: getAllEnquiryProducts() as any,
      });

      await loadEnquiries();
    handleCloseNewEnquiryModal();
      }
    } catch (error: any) {
      console.error('Error saving enquiry:', error);
      alert(error.message || `Failed to ${isSubmitMode ? 'submit' : 'create'} enquiry. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetailModal = (enquiryId: string) => {
    const enquiry = enquiries.find((e) => e._id === enquiryId);
    if (!enquiry) return;

    // If enquiry status is submitted, navigate to detail page
    if (enquiry.enquiryStatus === 'submitted') {
      router.push(`/enquiries/${enquiryId}`);
      return;
    }

    setSelectedEnquiryForDetail(enquiryId);

    // If enquiry status is draft, load data into edit form
    if (enquiry.enquiryStatus === 'draft') {
      setEditEnquiryName(enquiry.enquiryName || '');
      setEditShippingAddress({
        addressLine1: enquiry.shippingAddress?.addressLine1 || '',
        addressLine2: enquiry.shippingAddress?.addressLine2 || '',
        city: enquiry.shippingAddress?.city || '',
        state: enquiry.shippingAddress?.state || '',
        zipCode: enquiry.shippingAddress?.zipCode || '',
        country: enquiry.shippingAddress?.country || '',
      });
      setEditBillingAddress({
        addressLine1: enquiry.billingAddress?.addressLine1 || '',
        addressLine2: enquiry.billingAddress?.addressLine2 || '',
        city: enquiry.billingAddress?.city || '',
        state: enquiry.billingAddress?.state || '',
        zipCode: enquiry.billingAddress?.zipCode || '',
        country: enquiry.billingAddress?.country || '',
      });
      setEditExpectedDeliveryDate(
        enquiry.expectedDeliveryDate 
          ? new Date(enquiry.expectedDeliveryDate).toISOString().split('T')[0]
          : ''
      );
      setEditEnquiryStatus(enquiry.enquiryStatus || 'draft');
      setEditEnquiryNotes(enquiry.enquiryNotes || '');
      
      // Pre-fill attachment
      if (enquiry.attachment) {
        setEditEnquiryAttachmentUrl(enquiry.attachment);
      } else {
        setEditEnquiryAttachmentUrl('');
        setEditEnquiryAttachment(null);
      }
      
      // Load existing products
      const enquiryProductIds = enquiry.enquiryProducts?.map((p: any) => 
        typeof p === 'string' ? p : (p._id || p.id || p.productId)
      ) || [];
      setEditEnquirySelectedProductIds(enquiryProductIds);

      // Initialize product details from enquiry products
      const details: Record<string, { quantity: number; targetPrice: number; unit: string }> = {};
      enquiry.enquiryProducts?.forEach((p: any) => {
        const productId = typeof p === 'string' ? p : (p._id || p.id || p.productId);
        if (productId) {
          details[productId] = {
            quantity: typeof p === 'object' ? (parseFloat(p.quantity) || 0) : 0,
            targetPrice: typeof p === 'object' ? (parseFloat(p.targetPrice || p.targetUnitPrice) || 0) : 0,
            unit: typeof p === 'object' ? (p.unit || '') : '',
          };
        }
      });
      setProductDetails(details);
    }

    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedEnquiryForDetail(null);
    // Reset edit form
    setEditEnquiryName('');
    setEditShippingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setEditBillingAddress({
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    });
    setEditExpectedDeliveryDate('');
    setEditEnquiryStatus('draft');
    setEditEnquiryNotes('');
    setEditEnquiryAttachment(null);
    setEditEnquiryAttachmentUrl('');
    setEditEnquirySelectedProductIds([]);
  };

  const handleOpenProductViewModal = (enquiryId: string) => {
    setSelectedEnquiryForProductView(enquiryId);
    setIsProductViewModalOpen(true);
  };

  const handleCloseProductViewModal = () => {
    setIsProductViewModalOpen(false);
    setSelectedEnquiryForProductView(null);
  };

  const handleToggleEditEnquiryProductSelection = (productId: string) => {
    setEditEnquirySelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleDoneEditEnquiryProductSelection = () => {
    setIsEditEnquiryProductModalOpen(false);
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEnquiryForDetail) return;

    // Require authentication before sending enquiry
    if (!requireAuth()) {
      return;
    }
    
    if (!editEnquiryName.trim()) {
      alert('Please enter an enquiry name');
      return;
    }

    // Validate required address fields
    if (!editShippingAddress.addressLine1.trim() || !editShippingAddress.city.trim() || 
        !editShippingAddress.state.trim() || !editShippingAddress.zipCode.trim() || 
        !editShippingAddress.country.trim()) {
      alert('Please fill in all required shipping address fields.');
      return;
    }

    if (!editBillingAddress.addressLine1.trim() || !editBillingAddress.city.trim() || 
        !editBillingAddress.state.trim() || !editBillingAddress.zipCode.trim() || 
        !editBillingAddress.country.trim()) {
      alert('Please fill in all required billing address fields.');
      return;
    }

    if (!editExpectedDeliveryDate) {
      alert('Please select an expected delivery date.');
      return;
    }

    if (editEnquirySelectedProductIds.length === 0) {
      alert('Please add at least one product to the enquiry.');
      return;
    }

    setIsUpdatingEnquiry(true);
    try {
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        return;
      }

      await updateEnquiry(token, selectedEnquiryForDetail, {
        enquiryName: editEnquiryName.trim(),
        shippingAddress: {
          addressLine1: editShippingAddress.addressLine1,
          addressLine2: editShippingAddress.addressLine2 || undefined,
          city: editShippingAddress.city,
          state: editShippingAddress.state,
          zipCode: editShippingAddress.zipCode,
          country: editShippingAddress.country,
        },
        billingAddress: {
          addressLine1: editBillingAddress.addressLine1,
          addressLine2: editBillingAddress.addressLine2 || undefined,
          city: editBillingAddress.city,
          state: editBillingAddress.state,
          zipCode: editBillingAddress.zipCode,
          country: editBillingAddress.country,
        },
        expectedDeliveryDate: new Date(editExpectedDeliveryDate).toISOString(),
        enquiryStatus: 'submitted',
        enquiryNotes: editEnquiryNotes || undefined,
        attachment: editEnquiryAttachmentUrl || undefined,
        enquiryProducts: editEnquirySelectedProductIds.length > 0 ? mapProductIdsToEnquiryProducts(editEnquirySelectedProductIds) : [],
      });

      await loadEnquiries();
      handleCloseDetailModal();
      alert('Enquiry sent successfully!');
    } catch (error: any) {
      console.error('Error sending enquiry:', error);
      alert(error.message || 'Failed to send enquiry. Please try again.');
    } finally {
      setIsUpdatingEnquiry(false);
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

    // Initialize product details from enquiry products
    const details: Record<string, { quantity: number; targetPrice: number; unit: string }> = {};
    enquiry?.enquiryProducts?.forEach((p: any) => {
      const productId = typeof p === 'string' ? p : (p._id || p.id || p.productId);
      if (productId) {
        // Try to get details from EnquiryProduct if available
        const enquiryProduct = typeof p === 'object' && p.enquiryProduct ? p.enquiryProduct : null;
        details[productId] = {
          quantity: enquiryProduct?.quantity ? parseFloat(enquiryProduct.quantity) : (typeof p === 'object' ? (parseFloat(p.quantity) || 0) : 0),
          targetPrice: enquiryProduct?.targetUnitPrice ? parseFloat(enquiryProduct.targetUnitPrice) : (typeof p === 'object' ? (parseFloat(p.targetPrice || p.targetUnitPrice) || 0) : 0),
          unit: enquiryProduct?.unit || (typeof p === 'object' ? (p.unit || '') : ''),
        };
      }
    });
    setProductDetails(details);
    
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
        enquiryProducts: selectedProductIds.length > 0 ? mapProductIdsToEnquiryProducts(selectedProductIds) : [],
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
      <>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full px-6 py-6">

        {/* Content */}
        <div className="flex h-full w-full flex-col gap-6">

          {/* Main Title Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">My Enquiries</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Manage and view all your product enquiries.</p>
            </div>
          </div>

          {/* Tabs Belt */}
          <EnquiryTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            draftCount={enquiries.filter(e => e.enquiryStatus === 'draft').length}
            sentToAdminCount={enquiries.filter(e => e.enquiryStatus === 'submitted').length}
            vendorAssignedCount={(() => {
              const enquiryIdsWithQuotes = getEnquiryIdsWithQuotes();
              return enquiries.filter(
                (e) => e.enquiryStatus === 'submitted' && enquiryIdsWithQuotes.has(e._id || '')
              ).length;
            })()}
          />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div>
              {/* Summary and New Enquiry Button */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {getFilteredEnquiries().length} Enquir{getFilteredEnquiries().length !== 1 ? 'ies' : 'y'}
                  </h2>
                </div>
                <button
                  onClick={handleCreateEnquiry}
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
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
                <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading Enquiries...</p>
                </div>
              ) : getFilteredEnquiries().length === 0 ? (
                <div className="flex h-full items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
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
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {activeTab === 'draft' ? 'No draft enquiries' : 
                       activeTab === 'sentToAdmin' ? 'No quote requests' : 
                       'No quotes received'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {activeTab === 'draft' ? 'Create your first enquiry' : 
                       activeTab === 'sentToAdmin' ? 'Submit an enquiry to request quotes' : 
                       'No quotes have been received yet'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredEnquiries().map((enquiry) => {
                    const enquiryId = enquiry._id || '';
                    const isExpanded = expandedEnquiries.has(enquiryId);
                    const enquiryProducts = Array.isArray(enquiry.enquiryProducts) 
                      ? enquiry.enquiryProducts 
                      : [];
                    const totalProducts = enquiryProducts.length;

                    // Format enquiry ID for display (e.g., ENQ-D-001)
                    const enquiryRef = enquiry._id ? `ENQ-${enquiry._id.slice(-6).toUpperCase()}` : 'ENQ-XXXXXX';
                    const lastModified = enquiry.updatedAt && enquiry.updatedAt !== enquiry.createdAt 
                      ? formatDate(enquiry.updatedAt as string)
                      : formatDate(enquiry.createdAt as string);

                    // Get product names for tags (limit to first few for display)
                    const productTags = enquiryProducts.slice(0, 3).map((product: any) => {
                      const productId = typeof product === 'string' ? product : (product._id || product.id);
                      const productData = typeof product === 'string' 
                        ? getProductById(productId)
                        : product;
                      
                      if (!productData) return null;
                      
                      const productName = productData.displayName || productData.externalRef || 'Unknown Product';
                      // Try to get quantity from product data or default to 1
                      const quantity = productData.quantity || product.quantity || 1;
                      
                      return { name: productName, quantity };
                    }).filter(Boolean);

                    // Use different UI for draft tab
                    if (activeTab === 'draft') {
                      return (
                        <div
                          key={enquiryId}
                          className="bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-600 dark:border-gray-600 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-6">
                            {/* Left Section */}
                            <div className="flex-1">
                              {/* Title and Draft Badge */}
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold text-white">
                                  {enquiry.enquiryName}
                                </h3>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-800 dark:bg-gray-800">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <line x1="10" y1="9" x2="8" y2="9"></line>
                                    <line x1="16" y1="9" x2="14" y2="9"></line>
                                  </svg>
                                  <span className="text-white text-xs font-medium">Draft</span>
                                </span>
                              </div>

                              {/* Reference and Last Modified */}
                              <div className="text-sm text-gray-400 mb-4">
                                {enquiryRef} • Last modified {lastModified}
                              </div>

                              {/* Product Tags */}
                              {productTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {productTags.map((tag: any, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-800 dark:bg-gray-800 text-white text-sm"
                                    >
                                      {tag.name} x{tag.quantity}
                                    </span>
                                  ))}
                                  {totalProducts > 3 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-800 dark:bg-gray-800 text-white text-sm">
                                      +{totalProducts - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right Section - Continue Editing Button */}
                            <div className="ml-6">
                              <button
                                onClick={() => handleOpenDetailModal(enquiryId)}
                                className="px-4 py-2.5 bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                              >
                                Continue Editing
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
                                  <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Use same UI design for Quote Requested tab
                    if (activeTab === 'sentToAdmin') {
                      // Format enquiry ID for display (e.g., ENQ-S-001 for submitted)
                      const submittedEnquiryRef = enquiry._id ? `ENQ-S-${enquiry._id.slice(-6).toUpperCase()}` : 'ENQ-XXXXXX';
                      const sentDate = formatDate(enquiry.createdAt as string);
                      
                      // Determine status - for submitted enquiries, show "Processing" or similar
                      const statusText = 'Processing';
                      const statusColor = 'text-orange-500';

                      return (
                        <div
                          key={enquiryId}
                          className="bg-gray-800 dark:bg-gray-800 rounded-lg border border-teal-500 dark:border-teal-500 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-6">
                            {/* Left Section */}
                            <div className="flex-1">
                              {/* Title */}
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold text-white">
                                  {enquiry.enquiryName}
                                </h3>
                              </div>

                              {/* Reference and Sent Date */}
                              <div className="text-sm text-gray-400 mb-4">
                                {submittedEnquiryRef} • Sent on {sentDate}
                              </div>

                              {/* Product Tags */}
                              {productTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {productTags.map((tag: any, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-800 dark:bg-gray-800 text-white text-sm"
                                    >
                                      {tag.name} x{tag.quantity}
                                    </span>
                                  ))}
                                  {totalProducts > 3 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-800 dark:bg-gray-800 text-white text-sm">
                                      +{totalProducts - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right Section - Status and View Details Button */}
                            <div className="ml-6 flex items-center gap-4">
                              {/* Status */}
                              <div className="flex flex-col items-end">
                                <span className="text-sm text-gray-400 mb-1">Status</span>
                                <span className={`text-base font-medium ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>

                              {/* View Details Button */}
                              <button
                                onClick={() => handleOpenProductViewModal(enquiryId)}
                                className="px-4 py-2.5 bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                              >
                                View Details
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
                                  <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Use same UI design for Quote Received tab
                    if (activeTab === 'vendorAssigned') {
                      // Format enquiry ID for display (e.g., ENQ-V-001 for vendor assigned)
                      const vendorEnquiryRef = enquiry._id ? `ENQ-V-${enquiry._id.slice(-6).toUpperCase()}` : 'ENQ-XXXXXX';
                      const createdDate = formatDate(enquiry.createdAt as string);

                      // Get quotes for this enquiry
                      const enquiryQuotes = quotes.filter((quote) => {
                        if (!quote.visibletoClient) return false;
                        const assignment = quote.vendorAssignmentId as any;
                        const enquiryProduct = assignment?.enquiryProductId as any;
                        const quoteEnquiryId = enquiryProduct?.enquiryId?._id?.toString() || 
                                             enquiryProduct?.enquiryId?.toString() ||
                                             enquiryProduct?.enquiryId;
                        return quoteEnquiryId === enquiryId;
                      });

                      // Get unique vendors and product-vendor mappings
                      const vendorMap = new Map<string, { name: string; products: Array<{ productName: string; quantity: number }> }>();
                      const vendorIds = new Set<string>();

                      enquiryQuotes.forEach((quote) => {
                        const assignment = quote.vendorAssignmentId as any;
                        const vendor = assignment?.vendorId as any;
                        const enquiryProduct = assignment?.enquiryProductId as any;
                        const product = enquiryProduct?.productsheetitemid as any;
                        
                        if (!vendor || !product) return;

                        const vendorId = typeof vendor === 'string' ? vendor : (vendor._id || vendor.id);
                        const vendorName = typeof vendor === 'object' ? (vendor.auth?.name || vendor.name || 'Unknown Vendor') : 'Unknown Vendor';
                        const productName = product?.displayName || product?.externalRef || 'Unknown Product';
                        const quantity = product?.quantity || enquiryProduct?.quantity || 1;

                        vendorIds.add(vendorId);

                        if (!vendorMap.has(vendorId)) {
                          vendorMap.set(vendorId, { name: vendorName, products: [] });
                        }
                        vendorMap.get(vendorId)!.products.push({ productName, quantity });
                      });

                      const vendorsCount = vendorIds.size;
                      const quotesCount = enquiryQuotes.length;

                      // Get product-vendor items for display (first few)
                      const productVendorItems: Array<{ productName: string; quantity: number; vendorName: string }> = [];
                      vendorMap.forEach((vendorData) => {
                        vendorData.products.forEach((product) => {
                          productVendorItems.push({
                            productName: product.productName,
                            quantity: product.quantity,
                            vendorName: vendorData.name
                          });
                        });
                      });

                      return (
                        <div
                          key={enquiryId}
                          className="bg-gray-800 dark:bg-gray-800 rounded-lg border border-teal-500 dark:border-teal-500 overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-6">
                            {/* Left Section */}
                            <div className="flex-1">
                              {/* Title and Vendors Assigned Badge */}
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-xl font-bold text-white">
                                  {enquiry.enquiryName}
                                </h3>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-green-500 dark:border-green-500 bg-green-600 dark:bg-green-600">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white"
                                  >
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                  </svg>
                                  <span className="text-white text-xs font-medium">Vendors Assigned</span>
                                </span>
                              </div>

                              {/* Reference and Created Date */}
                              <div className="text-sm text-gray-400 mb-4">
                                {vendorEnquiryRef} • Created {createdDate}
                              </div>

                              {/* Product-Vendor Items */}
                              {productVendorItems.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {productVendorItems.slice(0, 3).map((item: any, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-700 dark:bg-gray-700 text-white text-sm"
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
                                        className="text-gray-400"
                                      >
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                      </svg>
                                      {item.productName} x{item.quantity} → <span className="text-green-400">{item.vendorName}</span>
                                    </span>
                                  ))}
                                  {productVendorItems.length > 3 && (
                                    <span className="inline-flex items-center px-3 py-1 rounded border border-gray-500 dark:border-gray-500 bg-gray-700 dark:bg-gray-700 text-white text-sm">
                                      +{productVendorItems.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right Section - Vendors/Quotes Count and View Details Button */}
                            <div className="ml-6 flex items-center gap-4">
                              {/* Vendors Count */}
                              <div className="flex flex-col items-end">
                                <span className="text-sm text-white mb-1">Vendors</span>
                                <span className="text-xl font-bold text-green-500">
                                  {vendorsCount}
                                </span>
                              </div>

                              {/* Quotes Count */}
                              <div className="flex flex-col items-end">
                                <span className="text-sm text-white mb-1">Quotes</span>
                                <span className="text-xl font-bold text-white">
                                  {quotesCount}
                                </span>
                              </div>

                              {/* View Details Button */}
                              <button
                                onClick={() => router.push(`/enquiries/${enquiryId}`)}
                                className="px-4 py-2.5 bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                              >
                                View Details
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
                                  <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Original UI for other tabs
                    return (
                      <div
                        key={enquiryId}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                      >
                        {/* Accordion Header */}
                        <button
                          onClick={() => toggleEnquiry(enquiryId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              >
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {enquiry.enquiryName}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                              <span className="px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full">
                                {totalProducts} item{totalProducts !== 1 ? 's' : ''}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetailModal(enquiryId);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5"
                              aria-label="View detail"
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
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              View detail
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductModal(enquiryId);
                              }}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5"
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
                            {/* 3-dot Menu */}
                            <div className="relative" ref={(el) => { menuRefs.current[enquiryId] = el; }}>
                              <button
                                onClick={(e) => toggleMenu(enquiryId, e)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
                                  <button
                                    onClick={(e) => handleSubmitEnquiry(enquiryId, e)}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
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
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
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
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                Products ({enquiryProducts.length})
                              </h4>
                            </div>
                            {enquiryProducts.length === 0 ? (
                              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                                <p>No products added to this enquiry yet.</p>
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
                                        className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
                                      className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                            <svg
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="text-gray-400 dark:text-gray-500"
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
                                            <span className="inline-block px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium rounded-full mb-1">
                                                {productData.category.toUpperCase()}
                                            </span>
                                            )}
                                            
                                            {/* Product Name */}
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white mt-1 mb-2">
                                              {productData.displayName || 'Unnamed Product'}
                                            </h4>

                                            {/* Specifications */}
                                            {specifications.length > 0 && (
                                              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                                {specifications.slice(0, 3).map((spec, specIndex) => (
                                                  <span
                                                    key={specIndex}
                                                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                                  >
                                                    {spec}
                                                  </span>
                                                ))}
                                                {specifications.length > 3 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => openSpecModal(specifications, productData.displayName)}
                                                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:text-gray-900 dark:hover:text-white transition-colors"
                                                  >
                                                    +{specifications.length - 3} more
                                                  </button>
                                                )}
                                              </div>
                                            )}

                                            {/* Product Details: Quantity, Target Price, Unit */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                  Quantity
                                                </label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={productDetails[productId]?.quantity || product.quantity || ''}
                                                  onChange={(e) => handleProductDetailChange(productId, 'quantity', parseFloat(e.target.value) || 0)}
                                                  placeholder="0"
                                                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                  Target Price
                                                </label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={productDetails[productId]?.targetPrice || product.targetPrice || ''}
                                                  onChange={(e) => handleProductDetailChange(productId, 'targetPrice', parseFloat(e.target.value) || 0)}
                                                  placeholder="0.00"
                                                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                  Unit
                                                </label>
                                                <input
                                                  type="text"
                                                  value={productDetails[productId]?.unit || product.unit || ''}
                                                  onChange={(e) => handleProductDetailChange(productId, 'unit', e.target.value)}
                                                  placeholder="e.g., kg, pcs, m"
                                                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                                />
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

      {/* Submit Enquiry Modal - Removed: Now using sidebar form for submitting */}
      {false && isSubmitModalOpen && selectedEnquiryForSubmit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleCloseSubmitModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Submit Enquiry
              </h2>
              <button
                onClick={handleCloseSubmitModal}
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
            <form onSubmit={handleSubmitEnquiryForm} className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Please provide the shipping and billing addresses for this enquiry.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shipping Address</h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Address Line 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 1 <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleShippingAddressChange('addressLine1', e.target.value)}
                    placeholder="Street address, P.O. box"
                    required
                    className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleShippingAddressChange('addressLine2', e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>

                {/* City and State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleShippingAddressChange('city', e.target.value)}
                      placeholder="City"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State/Province <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleShippingAddressChange('state', e.target.value)}
                      placeholder="State or Province"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Zip Code and Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ZIP/Postal Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) => handleShippingAddressChange('zipCode', e.target.value)}
                      placeholder="ZIP or Postal Code"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => handleShippingAddressChange('country', e.target.value)}
                      placeholder="Country"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-600">
                <button
                  type="button"
                  onClick={handleCloseSubmitModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
            className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col transform transition-transform duration-300 ease-out ${
              isDrawerAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add Products to Enquiry
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Select products from your product sheet
                </p>
              </div>
              <button
                onClick={handleCloseProductModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                    className="text-gray-400 dark:text-gray-500 mb-4"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No products available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
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
                            <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full mb-1">
                              {product.category.toUpperCase()}
                            </span>
                            )}
                            
                            {/* Product Name */}
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-1 mb-2">
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
                                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
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
                              ) : null;
                            })()}
                          </div>

                          {/* Product Details: Quantity, Target Price, Unit */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={productDetails[product._id || '']?.quantity || ''}
                                onChange={(e) => handleProductDetailChange(product._id || '', 'quantity', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Target Price
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={productDetails[product._id || '']?.targetPrice || ''}
                                onChange={(e) => handleProductDetailChange(product._id || '', 'targetPrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={productDetails[product._id || '']?.unit || ''}
                                onChange={(e) => handleProductDetailChange(product._id || '', 'unit', e.target.value)}
                                placeholder="e.g., kg, pcs, m"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent"
                              />
                            </div>
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
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
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

      {/* New Enquiry Sidebar */}
      {isNewEnquiryModalOpen && (
        <>
          {/* Overlay */}
        <div 
            className="fixed inset-0 bg-black/50 z-40"
          onClick={handleCloseNewEnquiryModal}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="flex h-full flex-col">
              {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {isSubmitMode ? 'Submit Enquiry' : 'Create new enquiry'}
              </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isSubmitMode ? 'Review and update the details before submitting' : 'Fill in the details to create a new enquiry'}
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
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="dd-mm-yyyy"
                            required
                          />
                          {/* <svg
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
                          </svg> */}
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
                        {selectedShippingAddressIndex !== null && buyerProfile?.shippingAddress?.[selectedShippingAddressIndex] && !useNewShippingAddress ? (
                          <div className="w-full px-4 py-2.5 min-h-[42px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm">
                                {formatAddressAsString(buyerProfile.shippingAddress[selectedShippingAddressIndex])}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedShippingAddressIndex(null);
                                setUseNewShippingAddress(true);
                              }}
                              className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              aria-label="Remove address"
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
                        ) : (
                          <input
                            type="text"
                            value={getShippingAddressString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              setShippingAddress({
                                addressLine1: value,
                                addressLine2: '',
                                city: '',
                                state: '',
                                zipCode: '',
                                country: '',
                              });
                              setUseNewShippingAddress(true);
                              setSelectedShippingAddressIndex(null);
                            }}
                            placeholder="Enter full shipping address"
                            required
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          />
                        )}
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
                        {selectedBillingAddressIndex !== null && buyerProfile?.billingAddress?.[selectedBillingAddressIndex] && !useNewBillingAddress ? (
                          <div className="w-full px-4 py-2.5 min-h-[42px] text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm">
                                {formatAddressAsString(buyerProfile.billingAddress[selectedBillingAddressIndex])}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBillingAddressIndex(null);
                                setUseNewBillingAddress(true);
                              }}
                              className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              aria-label="Remove address"
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
                        ) : (
                          <input
                            type="text"
                            value={getBillingAddressString()}
                            onChange={(e) => {
                              const value = e.target.value;
                              setBillingAddress({
                                addressLine1: value,
                                addressLine2: '',
                                city: '',
                                state: '',
                                zipCode: '',
                                country: '',
                              });
                              setUseNewBillingAddress(true);
                              setSelectedBillingAddressIndex(null);
                            }}
                            placeholder="Enter full billing address"
                            required
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          />
                        )}
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
                          Add
                        </button>
                        {/* <button
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
                        </button> */}
                      </div>
                    </div>

                    {/* Inline Product Generation Field */}
                    <div className="space-y-3 p-3 bg-[#343541] rounded-lg border border-gray-600">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Product with AI
                      </label>
                      {!inlineGeneratedFields ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inlineProductKeyword}
                            onChange={(e) => setInlineProductKeyword(e.target.value)}
                            placeholder="e.g., laptop, office chair, printer"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !isGeneratingInline) {
                                handleInlineGenerateProduct();
                              }
                            }}
                            disabled={isGeneratingInline}
                          />
                          <button
                            type="button"
                            onClick={handleInlineGenerateProduct}
                            disabled={isGeneratingInline || !inlineProductKeyword.trim()}
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                          >
                            {isGeneratingInline ? (
                              <svg
                                className="animate-spin"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                              </svg>
                            ) : (
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
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                {inlineGeneratedFields.item}
                              </h4>
                              <p className="text-xs text-gray-400 mt-0.5">AI Generated</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineGeneratedFields(null);
                                setInlineSpecFormData({});
                                setInlineProductKeyword('');
                              }}
                              className="text-xs text-gray-400 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Generated Fields */}
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {inlineGeneratedFields.fields.map((field, index) => (
                              <div key={index} className="space-y-1">
                                <label className="block text-xs font-medium text-gray-300">
                                  {field.label}
                                  {field.type !== 'textarea' && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {field.type === 'dropdown' && field.options ? (
                                  <CreatableSelect
                                    value={(inlineSpecFormData[field.label] as string[]) || []}
                                    onChange={(value) => handleInlineSpecInputChange(field.label, value)}
                                    options={field.options}
                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                    required
                                    className="w-full"
                                  />
                                ) : field.type === 'textarea' ? (
                                  <textarea
                                    value={(inlineSpecFormData[field.label] as string) || ''}
                                    onChange={(e) => handleInlineSpecInputChange(field.label, e.target.value)}
                                    placeholder={field.placeholder || `e.g., Specific requirements...`}
                                    rows={3}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                  />
                                ) : field.type === 'number' ? (
                                  <input
                                    type="number"
                                    value={(inlineSpecFormData[field.label] as number) || ''}
                                    onChange={(e) => handleInlineSpecInputChange(field.label, parseFloat(e.target.value) || 0)}
                                    placeholder={field.placeholder || `e.g., 50`}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    required
                                  />
                                ) : (
                                  <CreatableSelect
                                    value={
                                      Array.isArray(inlineSpecFormData[field.label])
                                        ? (inlineSpecFormData[field.label] as string[])
                                        : inlineSpecFormData[field.label]
                                        ? String(inlineSpecFormData[field.label])
                                            .split(',')
                                            .map((v) => v.trim())
                                            .filter((v) => v.length > 0)
                                        : []
                                    }
                                    onChange={(value) => handleInlineSpecInputChange(field.label, value)}
                                    options={[]}
                                    placeholder={field.placeholder || `Type and press Enter to add ${field.label.toLowerCase()}`}
                                    required
                                    className="w-full"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleAddInlineGeneratedProduct}
                            className="w-full px-4 py-2 bg-teal-600 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                            Add Product
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Products List or Empty State */}
                    {newEnquirySelectedProductIds.length === 0 && customProductRows.length === 0 ? (
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
                    ) : (
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex flex-col" style={{ maxHeight: '400px' }}>
                        <div className="overflow-y-auto overflow-x-auto flex-1">
                          <table className="w-full border-collapse bg-white dark:bg-gray-800">
                          {/* Table Header */}
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                                Name
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">
                                Unit
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Target Price
                              </th>
                            </tr>
                          </thead>
                          {/* Table Body */}
                          <tbody>
                            {/* Selected Products from Product Sheet */}
                            {newEnquirySelectedProductIds.map((productId, index) => {
                              const product = productSheetItems.find((p) => p._id === productId);
                              if (!product) return null;
                              return (
                                <tr
                                  key={productId}
                                  className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                                  }`}
                                >
                                  {/* Name Column */}
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                    <div>
                                      <p className="font-medium">
                                        {product.displayName || product.category || 'Unnamed Product'}
                                      </p>
                                      {product.category && (
                                        <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                                      )}
                                    </div>
                                  </td>
                                  {/* Quantity Column */}
                                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
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
                                  <td className="px-4 py-3">
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
                                </tr>
                              );
                            })}
                            {/* Custom Product Rows */}
                            {customProductRows.map((row, index) => {
                              const totalIndex = newEnquirySelectedProductIds.length + index;
                              return (
                                <tr
                                  key={row.id}
                                  className={`border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                    totalIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
                                  }`}
                                >
                                  {/* Name Column */}
                                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={row.name}
                                        onChange={(e) => handleCustomProductChange(row.id, 'name', e.target.value)}
                                        placeholder="Enter product name"
                                        className="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCustomRow(row.id)}
                                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded transition-colors"
                                        aria-label="Remove row"
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
                                  </td>
                                  {/* Quantity Column */}
                                  <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-600">
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
                                      value={row.unit}
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
                                  <td className="px-4 py-3">
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
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
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
                    <div className="flex justify-end gap-3">
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
                        {isSubmitting 
                          ? (isSubmitMode ? 'Submitting...' : 'Creating...') 
                          : (isSubmitMode ? 'Submit Enquiry' : 'Create Enquiry')}
                </button>
                    </div>
              </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Enquiry Sidebar (for draft enquiries) */}
      {isDetailModalOpen && selectedEnquiryForDetail && (() => {
        const enquiry = enquiries.find((e) => e._id === selectedEnquiryForDetail);
        if (!enquiry || enquiry.enquiryStatus !== 'draft') return null;

        return (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleCloseDetailModal}
            />
            
            {/* Sidebar */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex h-full flex-col">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Edit Enquiry
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Update enquiry details
                    </p>
                  </div>
                  <button
                    onClick={handleCloseDetailModal}
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
                  <form onSubmit={handleSendEnquiry} className="p-6 space-y-6">
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
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enquiry Details</h3>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="w-1/2">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Enquiry Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editEnquiryName}
                            onChange={(e) => setEditEnquiryName(e.target.value)}
                            placeholder="e.g., Office Furniture Order Q1"
                            className="w-full rounded-lg border border-teal-300 bg-[#343541] px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div className="w-1/2">
                          <div className="flex items-center gap-2 mb-1">
                            <label className="block text-sm font-medium text-gray-300">
                              Expected Delivery Date <span className="text-red-400">*</span>
                            </label>
                          </div>
                          <div className="relative">
                            <input
                              type="date"
                              value={editExpectedDeliveryDate}
                              onChange={(e) => setEditExpectedDeliveryDate(e.target.value)}
                              className="w-full rounded-lg border border-gray-600 bg-[#343541] px-3 py-2 pr-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Shipping Address</h3>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address Line 1 <span className="text-red-500 dark:text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={editShippingAddress.addressLine1}
                          onChange={(e) =>
                            setEditShippingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                          }
                          placeholder="Street address"
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={editShippingAddress.addressLine2}
                          onChange={(e) =>
                            setEditShippingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                          }
                          placeholder="Apartment, suite, etc. (optional)"
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            City <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editShippingAddress.city}
                            onChange={(e) =>
                              setEditShippingAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="City"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State <span className="text-red-500 dark:text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editShippingAddress.state}
                            onChange={(e) =>
                              setEditShippingAddress((prev) => ({ ...prev, state: e.target.value }))
                            }
                            placeholder="State"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            ZIP Code <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editShippingAddress.zipCode}
                            onChange={(e) =>
                              setEditShippingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                            }
                            placeholder="ZIP code"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Country <span className="text-red-500 dark:text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editShippingAddress.country}
                            onChange={(e) =>
                              setEditShippingAddress((prev) => ({ ...prev, country: e.target.value }))
                            }
                            placeholder="Country"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Billing Address Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Address</h3>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address Line 1 <span className="text-red-500 dark:text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={editBillingAddress.addressLine1}
                          onChange={(e) =>
                            setEditBillingAddress((prev) => ({ ...prev, addressLine1: e.target.value }))
                          }
                          placeholder="Street address"
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={editBillingAddress.addressLine2}
                          onChange={(e) =>
                            setEditBillingAddress((prev) => ({ ...prev, addressLine2: e.target.value }))
                          }
                          placeholder="Apartment, suite, etc. (optional)"
                          className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            City <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editBillingAddress.city}
                            onChange={(e) =>
                              setEditBillingAddress((prev) => ({ ...prev, city: e.target.value }))
                            }
                            placeholder="City"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            State <span className="text-red-500 dark:text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editBillingAddress.state}
                            onChange={(e) =>
                              setEditBillingAddress((prev) => ({ ...prev, state: e.target.value }))
                            }
                            placeholder="State"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            ZIP Code <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editBillingAddress.zipCode}
                            onChange={(e) =>
                              setEditBillingAddress((prev) => ({ ...prev, zipCode: e.target.value }))
                            }
                            placeholder="ZIP code"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Country <span className="text-red-500 dark:text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={editBillingAddress.country}
                            onChange={(e) =>
                              setEditBillingAddress((prev) => ({ ...prev, country: e.target.value }))
                            }
                            placeholder="Country"
                            className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400"
                            required
                          />
                        </div>
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
                            Products ({editEnquirySelectedProductIds.length})
                          </h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditEnquiryProductModalOpen(true);
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

                    {/* Inline Product Generation Field */}
                    <div className="space-y-3 p-3 bg-[#343541] rounded-lg border border-gray-600">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Generate Product with AI
                      </label>
                      {!inlineGeneratedFields ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={inlineProductKeyword}
                            onChange={(e) => setInlineProductKeyword(e.target.value)}
                            placeholder="e.g., laptop, office chair, printer"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !isGeneratingInline) {
                                handleInlineGenerateProduct();
                              }
                            }}
                            disabled={isGeneratingInline}
                          />
                          <button
                            type="button"
                            onClick={handleInlineGenerateProduct}
                            disabled={isGeneratingInline || !inlineProductKeyword.trim()}
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                          >
                            {isGeneratingInline ? (
                              <svg
                                className="animate-spin"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                              </svg>
                            ) : (
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
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                {inlineGeneratedFields.item}
                              </h4>
                              <p className="text-xs text-gray-400 mt-0.5">AI Generated</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInlineGeneratedFields(null);
                                setInlineSpecFormData({});
                                setInlineProductKeyword('');
                              }}
                              className="text-xs text-gray-400 hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Generated Fields */}
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {inlineGeneratedFields.fields.map((field, index) => (
                              <div key={index} className="space-y-1">
                                <label className="block text-xs font-medium text-gray-300">
                                  {field.label}
                                  {field.type !== 'textarea' && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {field.type === 'dropdown' && field.options ? (
                                  <CreatableSelect
                                    value={(inlineSpecFormData[field.label] as string[]) || []}
                                    onChange={(value) => handleInlineSpecInputChange(field.label, value)}
                                    options={field.options}
                                    placeholder={`Select ${field.label.toLowerCase()}`}
                                    required
                                    className="w-full"
                                  />
                                ) : field.type === 'textarea' ? (
                                  <textarea
                                    value={(inlineSpecFormData[field.label] as string) || ''}
                                    onChange={(e) => handleInlineSpecInputChange(field.label, e.target.value)}
                                    placeholder={field.placeholder || `e.g., Specific requirements...`}
                                    rows={3}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                  />
                                ) : field.type === 'number' ? (
                                  <input
                                    type="number"
                                    value={(inlineSpecFormData[field.label] as number) || ''}
                                    onChange={(e) => handleInlineSpecInputChange(field.label, parseFloat(e.target.value) || 0)}
                                    placeholder={field.placeholder || `e.g., 50`}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    required
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    {/* Display existing values as tags */}
                                    {(() => {
                                      const fieldValue = inlineSpecFormData[field.label];
                                      const values = Array.isArray(fieldValue) ? fieldValue : (typeof fieldValue === 'string' && fieldValue.trim() ? (fieldValue.includes(',') ? fieldValue.split(',').map(v => v.trim()).filter(v => v) : [fieldValue.trim()]) : []);
                                      return values.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                          {values.map((value, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-teal-500/20 text-teal-300 text-xs rounded border border-teal-500/30"
                                            >
                                              {value}
                                              <button
                                                type="button"
                                                onClick={() => handleInlineRemoveValue(field.label, value)}
                                                className="text-teal-300 hover:text-teal-100 transition-colors"
                                              >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : null;
                                    })()}
                                    {/* Input field */}
                                    <input
                                      type="text"
                                      value={inlineTextInputValues[field.label] || ''}
                                      onChange={(e) => {
                                        setInlineTextInputValues(prev => ({ ...prev, [field.label]: e.target.value }));
                                      }}
                                      onKeyDown={(e) => {
                                        handleInlineTextInputKeyDown(e, field.label);
                                        // Clear the input value in state after adding
                                        if (e.key === 'Enter') {
                                          setInlineTextInputValues(prev => ({ ...prev, [field.label]: '' }));
                                        }
                                      }}
                                      placeholder={(() => {
                                        const fieldValue = inlineSpecFormData[field.label];
                                        const hasValues = Array.isArray(fieldValue) ? fieldValue.length > 0 : (typeof fieldValue === 'string' && fieldValue.trim());
                                        return hasValues 
                                          ? `Add another ${field.label.toLowerCase()} (press Enter to add)`
                                          : (field.placeholder || `Enter ${field.label.toLowerCase()} (press Enter to add)`);
                                      })()}
                                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                      required={!Array.isArray(inlineSpecFormData[field.label]) || (Array.isArray(inlineSpecFormData[field.label]) && inlineSpecFormData[field.label].length === 0)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              if (!inlineGeneratedFields) return;
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
                                  userAttributes: userAttributes,
                                  adminProductId: null,
                                  externalRef: null,
                                });

                                await loadProducts();
                                if (newProduct._id) {
                                  setEditEnquirySelectedProductIds((prev) => [...prev, newProduct._id]);
                                }

                                setInlineProductKeyword('');
                                setInlineGeneratedFields(null);
                                setInlineSpecFormData({});
                                alert('Product generated and added to enquiry successfully!');
                              } catch (error: any) {
                                console.error('Error adding product:', error);
                                alert(error.message || 'Failed to add product. Please try again.');
                              }
                            }}
                            className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
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
                            Add Product
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Products List or Empty State */}
                    {editEnquirySelectedProductIds.length === 0 ? (
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
                    ) : (
                      <div className="space-y-2">
                        {editEnquirySelectedProductIds.map((productId) => {
                          const product = productSheetItems.find((p) => p._id === productId);
                          if (!product) return null;
                          return (
                            <div
                              key={productId}
                              className="p-3 bg-[#343541] rounded-lg border border-gray-600 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {product.displayName || product.category || 'Unnamed Product'}
                                  </p>
                                  {product.category && (
                                    <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                                  )}
                                  
                                  {/* Product Specifications */}
                                  {(() => {
                                    const specifications: string[] = [];
                                    if (product.userAttributes) {
                                      Object.entries(product.userAttributes).forEach(([key, value]) => {
                                        if (value !== '' && value !== 0 && value !== null) {
                                          // Skip image fields
                                          if (key.toLowerCase() === 'image_link' || key.toLowerCase() === 'image_attachment') {
                                            return;
                                          }
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
                                          <button
                                            type="button"
                                            onClick={() => openSpecModal(specifications, product.displayName || product.category || 'Product')}
                                            className="text-xs px-2 py-1 bg-[#202123] text-gray-400 rounded hover:text-gray-300 transition-colors"
                                          >
                                            +{specifications.length - 3} more
                                          </button>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExpandedProductDetails((prev) => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(productId)) {
                                          newSet.delete(productId);
                                        } else {
                                          newSet.add(productId);
                                        }
                                        return newSet;
                                      });
                                    }}
                                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
                                  >
                                    {expandedProductDetails.has(productId) ? (
                                      <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="18 15 12 9 6 15"></polyline>
                                        </svg>
                                        Hide Details
                                      </>
                                    ) : (
                                      <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                        Show Details
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditEnquirySelectedProductIds((prev) =>
                                        prev.filter((id) => id !== productId)
                                      );
                                    }}
                                    className="ml-3 p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    aria-label="Remove product"
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
                              
                              {/* Product Details: Quantity, Target Price, Unit */}
                              {expandedProductDetails.has(productId) && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-600">
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={productDetails[productId]?.quantity || ''}
                                    onChange={(e) => handleProductDetailChange(productId, 'quantity', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Target Price
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={productDetails[productId]?.targetPrice || ''}
                                    onChange={(e) => handleProductDetailChange(productId, 'targetPrice', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-[#202123] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1">
                                    Unit
                                  </label>
                                  <select
                                    value={productDetails[productId]?.unit || ''}
                                    onChange={(e) => handleProductDetailChange(productId, 'unit', e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-[#202123] text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                  >
                                    <option value="">Select unit</option>
                                    {STANDARD_UNITS.map((unit) => (
                                      <option key={unit} value={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              )}
                            </div>
                          );
                          })}
                      </div>
                    )}
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h3>
                      </div>
                      <textarea
                        value={editEnquiryNotes}
                        onChange={(e) => setEditEnquiryNotes(e.target.value)}
                        placeholder="Add any additional notes or requirements..."
                        rows={4}
                        className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-400 resize-none"
                      />
                    </div>

                    {/* Attachment Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
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
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attachment</h3>
                      </div>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          // Fire and forget; handler manages state and errors
                          void handleEditEnquiryAttachmentChange(file);
                        }}
                        className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 dark:file:bg-teal-900 file:text-teal-700 dark:file:text-teal-200 hover:file:bg-teal-100 dark:hover:file:bg-teal-800"
                      />
                      {editEnquiryAttachment && (
                        <p className="text-sm text-gray-400">
                          Selected: {editEnquiryAttachment.name}
                        </p>
                      )}
                      {editEnquiryAttachmentUrl && !editEnquiryAttachment && (
                        <p className="text-sm text-gray-400">
                          Current attachment exists
                        </p>
                      )}
                    </div>

                    {/* Form Footer */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCloseDetailModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingEnquiry}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        {isUpdatingEnquiry ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Sending...
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
                              <line x1="22" y1="2" x2="11" y2="13"></line>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            Send Enquiry
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Edit Enquiry Product Selection Modal */}
      {isEditEnquiryProductModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsEditEnquiryProductModalOpen(false)}
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
                onClick={() => setIsEditEnquiryProductModalOpen(false)}
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
                    const isSelected = editEnquirySelectedProductIds.includes(product._id || '');
                    return (
                      <div
                        key={product._id}
                        className="bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleEditEnquiryProductSelection(product._id || '')}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {product.displayName || product.category || 'Unnamed Product'}
                            </p>
                            {product.category && (
                              <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleDoneEditEnquiryProductSelection}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
                          <CreatableSelect
                            value={
                              Array.isArray(specFormData[field.label])
                                ? (specFormData[field.label] as string[])
                                : specFormData[field.label]
                                ? String(specFormData[field.label])
                                    .split(',')
                                    .map((v) => v.trim())
                                    .filter((v) => v.length > 0)
                                : []
                            }
                            onChange={(value) => handleSpecInputChange(field.label, value)}
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

      {/* Product View Modal for Quote Requested Tab */}
      {/* Product View Sidebar */}
      {isProductViewModalOpen && selectedEnquiryForProductView && (() => {
        const enquiry = enquiries.find((e) => e._id === selectedEnquiryForProductView);
        if (!enquiry) return null;

        const enquiryProducts = Array.isArray(enquiry.enquiryProducts) 
          ? enquiry.enquiryProducts 
          : [];

        return (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black/50 z-50 transition-opacity"
              onClick={handleCloseProductViewModal}
            />
            
            {/* Sidebar */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {enquiry.enquiryName}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Products in this enquiry
                  </p>
                </div>
                <button
                  onClick={handleCloseProductViewModal}
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
              <div className="flex-1 overflow-y-auto p-6">
                {enquiryProducts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
                      No products added to this enquiry yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enquiryProducts.map((product: any, index: number) => {
                      const productId = typeof product === 'string' ? product : (product._id || product.id);
                      const productData = typeof product === 'string' 
                        ? getProductById(productId)
                        : product;
                      
                      if (!productData) {
                        return (
                          <div
                            key={index}
                            className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100"
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

                      const quantity = productData.quantity || product.quantity || 1;

                      return (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-gray-400 dark:text-gray-500"
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
                                {/* Product Name */}
                                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                  {productData.displayName || 'Unnamed Product'}
                                </h4>

                                {/* Quantity */}
                                <div className="mb-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Quantity: </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{quantity}</span>
                                </div>

                                {/* Specifications */}
                                {specifications.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2 mb-3">
                                    {specifications.slice(0, 5).map((spec, specIndex) => (
                                      <span
                                        key={specIndex}
                                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                      >
                                        {spec}
                                      </span>
                                    ))}
                                    {specifications.length > 5 && (
                                      <button
                                        type="button"
                                        onClick={() => openSpecModal(specifications, productData.displayName || 'Product Specifications')}
                                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                      >
                                        +{specifications.length - 5} more
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

              {/* Sidebar Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
                <button
                  onClick={handleCloseProductViewModal}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Loading Overlay */}
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
            {/* Modal Header */}
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

            {/* Modal Content */}
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
                      setUseNewShippingAddress(true);
                      setSelectedShippingAddressIndex(null);
                      setShippingAddress({
                        addressLine1: '',
                        addressLine2: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: '',
                      });
                      setIsShippingAddressModalOpen(false);
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
            {/* Modal Header */}
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

            {/* Modal Content */}
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
                      setUseNewBillingAddress(true);
                      setSelectedBillingAddressIndex(null);
                      setBillingAddress({
                        addressLine1: '',
                        addressLine2: '',
                        city: '',
                        state: '',
                        zipCode: '',
                        country: '',
                      });
                      setIsBillingAddressModalOpen(false);
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

      {/* {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#40414F] rounded-lg p-6">
            <p className="text-white">Loading enquiries...</p>
          </div>
        </div>
      )} */}
    );
      </>
  );
}
