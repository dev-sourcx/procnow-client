'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuthToken } from '@/lib/storage';
import { getCurrentUser, getEnquiry, getBuyerQuotes, updateBuyerQuoteStatus, type CurrentUser, type Enquiry, type Quote } from '@/lib/api';
import { requireAuth } from '@/lib/auth';
import { showToast } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { theme, toggleTheme } = useTheme();
  const enquiryId = params?.id as string;

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'quotesRequested' | 'quotesReceived' | 'chatWithAdmin'>('quotesRequested');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set()); // Keep for quotes received tab
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQuotes, setSelectedQuotes] = useState<Map<string, string>>(new Map()); // productId -> quoteId

  useEffect(() => {
    requireAuth();
    if (enquiryId) {
      loadData();
    }
  }, [enquiryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Load enquiry details
      const enquiryData = await getEnquiry(token, enquiryId);
      setEnquiry(enquiryData);

      // Load all quotes and filter by enquiry ID and visibletoClient
      const allQuotes = await getBuyerQuotes(token);
      const enquiryQuotes = allQuotes.filter((quote) => {
        // Only show quotes that are visible to client
        if (!quote.visibletoClient) {
          return false;
        }
        const assignment = quote.vendorAssignmentId as any;
        const enquiryProduct = assignment?.enquiryProductId as any;
        // Handle both populated and non-populated enquiryId
        const quoteEnquiryId = enquiryProduct?.enquiryId?._id?.toString() || 
                               enquiryProduct?.enquiryId?.toString() ||
                               enquiryProduct?.enquiryId;
        return quoteEnquiryId === enquiryId;
      });
      setQuotes(enquiryQuotes);

      // Set first product as selected by default
      if (enquiryData.enquiryProducts && enquiryData.enquiryProducts.length > 0) {
        const firstProduct = enquiryData.enquiryProducts[0];
        const firstProductId = typeof firstProduct === 'string' 
          ? firstProduct 
          : (firstProduct._id || (firstProduct as any).id || '');
        if (firstProductId) {
          setSelectedProductId(firstProductId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiry details');
      console.error('Error loading enquiry details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const toggleProduct = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Get product details for selected product
  const getProductDetails = (product: any) => {
    if (typeof product === 'string') {
      return null;
    }
    
    const productItem = product.productsheetitemid || product;
    const imageLink = productItem?.userAttributes?.image_link || 
                      productItem?.userAttributes?.Image_Attachment || '';
    const displayName = productItem?.displayName || productItem?.name || 'Unknown Product';
    const description = productItem?.userAttributes?.description || 
                       productItem?.description || 
                       'No description available';
    const quantity = product.quantity || 1;
    const targetPrice = product.targetUnitPrice || productItem?.userAttributes?.targetPrice || 'N/A';
    const needByDate = product.deliveryDate || product.expectedDeliveryDate || enquiry?.expectedDeliveryDate || 'N/A';

    return {
      imageLink,
      displayName,
      description,
      quantity,
      targetPrice,
      needByDate
    };
  };

  // Get vendors assigned to a specific product
  const getVendorsForProduct = (productId: string) => {
    if (!quotes.length) return [];

    const productVendors: Array<{
      vendorId: string;
      vendorName: string;
      status: 'Quoted' | 'RFQ Sent';
      quote?: Quote;
    }> = [];

    quotes.forEach((quote) => {
      const assignment = quote.vendorAssignmentId as any;
      const enquiryProduct = assignment?.enquiryProductId as any;
      const enquiryProductId = enquiryProduct?._id?.toString() || enquiryProduct?._id || enquiryProduct?.id;
      
      if (enquiryProductId === productId) {
        const vendor = assignment?.vendorId as any;
        const vendorId = typeof vendor === 'string' ? vendor : (vendor._id || vendor.id);
        const vendorName = typeof vendor === 'object' ? (vendor.auth?.name || vendor.name || 'Unknown Vendor') : 'Unknown Vendor';
        
        // Determine status based on quote existence
        const status: 'Quoted' | 'RFQ Sent' = quote.vendorStatus === 'sent' ? 'Quoted' : 'RFQ Sent';
        
        // Check if vendor already added
        const existingIndex = productVendors.findIndex(v => v.vendorId === vendorId);
        if (existingIndex === -1) {
          productVendors.push({
            vendorId,
            vendorName,
            status,
            quote: status === 'Quoted' ? quote : undefined
          });
        } else if (status === 'Quoted') {
          // Update to Quoted if we find a quote
          productVendors[existingIndex].status = 'Quoted';
          productVendors[existingIndex].quote = quote;
        }
      }
    });

    return productVendors;
  };

  // Get all vendors who have quotes for any product in the enquiry
  const getAllVendorsForEnquiry = () => {
    if (!quotes.length) return [];

    const allVendors: Array<{
      vendorId: string;
      vendorName: string;
      status: 'Quoted' | 'RFQ Sent';
    }> = [];

    quotes.forEach((quote) => {
      const assignment = quote.vendorAssignmentId as any;
      const vendor = assignment?.vendorId as any;
      const vendorId = typeof vendor === 'string' ? vendor : (vendor._id || vendor.id);
      const vendorName = typeof vendor === 'object' ? (vendor.auth?.name || vendor.name || 'Unknown Vendor') : 'Unknown Vendor';
      
      // Determine status based on quote existence - if quote exists, status is 'Quoted', otherwise 'RFQ Sent'
      const status: 'Quoted' | 'RFQ Sent' = quote.vendorStatus === 'sent' ? 'Quoted' : 'RFQ Sent';
      
      // Check if vendor already added
      const existingIndex = allVendors.findIndex(v => v.vendorId === vendorId);
      if (existingIndex === -1) {
        allVendors.push({
          vendorId,
          vendorName,
          status
        });
      } else if (status === 'Quoted') {
        // Update to Quoted if we find a quote (prioritize Quoted status)
        allVendors[existingIndex].status = 'Quoted';
      }
    });

    return allVendors;
  };

  // Get vendors with quotes for a specific product for comparison table
  const getVendorQuotesForProduct = (productId: string) => {
    if (!quotes.length || !productId) return [];

    const vendorQuotes: Array<{
      vendorId: string;
      vendorName: string;
      status: 'Pending' | 'Approved';
      quote: Quote;
    }> = [];

    quotes.forEach((quote) => {
      const assignment = quote.vendorAssignmentId as any;
      if (!assignment) return;
      
      const enquiryProduct = assignment?.enquiryProductId as any;
      if (!enquiryProduct) return;

      let enquiryProductId: string | null = enquiryProduct?.productsheetitemid?._id?.toString() || enquiryProduct?.productsheetitemid?._id || enquiryProduct?.productsheetitemid?.id?.toString() || enquiryProduct?.productsheetitemid?.id;

      if (!enquiryProductId) return;
      
      // Normalize both IDs for comparison (convert to string and trim)
      const normalizedProductId = productId.toString().trim();
      const normalizedEnquiryProductId = enquiryProductId.toString().trim();

      console.log(normalizedProductId, normalizedEnquiryProductId);
      
      // Match product ID - quotes are already filtered by enquiry and visibletoClient
      if (normalizedEnquiryProductId === normalizedProductId) {
        const vendor = assignment?.vendorId as any;
        if (!vendor) return;
        
        const vendorId = typeof vendor === 'string' 
          ? vendor 
          : (vendor._id?.toString() || vendor._id || vendor.id?.toString() || vendor.id);
        const vendorName = typeof vendor === 'object' && vendor !== null
          ? (vendor.auth?.name || vendor.name || vendor.companyName || 'Unknown Vendor')
          : 'Unknown Vendor';
        
        // Determine status: Approved if buyerStatus is 'approved' or 'Accepted', otherwise Pending
        const buyerStatus = quote.buyerStatus?.toLowerCase();
        const status: 'Pending' | 'Approved' = (buyerStatus === 'approved' || buyerStatus === 'accepted') ? 'Approved' : 'Pending';
        
        // Check if vendor already added (avoid duplicates)
        const existingIndex = vendorQuotes.findIndex(v => v.vendorId === vendorId);
        if (existingIndex === -1) {
          vendorQuotes.push({
            vendorId,
            vendorName,
            status,
            quote
          });
        }
      }
    });

    return vendorQuotes;
  };

  // Get the selected/accepted quote for a product
  const getSelectedQuoteForProduct = (productId: string, vendorQuotesForProduct: ReturnType<typeof getVendorQuotesForProduct>) => {
    // Check if there's a quote with buyerStatus as 'approved' or 'Accepted'
    const acceptedQuote = vendorQuotesForProduct.find(vq => {
      const buyerStatus = vq.quote.buyerStatus?.toLowerCase();
      return buyerStatus === 'approved' || buyerStatus === 'accepted';
    });
    
    if (acceptedQuote) {
      return acceptedQuote.quote._id || (acceptedQuote.quote as any).id;
    }
    
    return null;
  };


  const handleProductSheetClick = () => {
    router.push('/product-sheet');
  };

  const handleEnquiriesClick = () => {
    router.push('/enquiries');
  };

  const handleQuotesClick = () => {
    router.push('/quotes');
  };

  const handleQuoteSelect = (productId: string, quoteId: string) => {
    setSelectedQuotes((prev) => {
      const newMap = new Map(prev);
      newMap.set(productId, quoteId);
      return newMap;
    });
  };

  const handleSubmitQuotes = async () => {
    if (!enquiry || !enquiry.enquiryProducts) return;

    const token = getAuthToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    if (selectedQuotes.size === 0) {
      showToast({ type: 'error', message: 'Please select at least one quote before submitting.' });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatePromises: Promise<void>[] = [];

      // Iterate through all products
      enquiry.enquiryProducts.forEach((product: any) => {
        const productId = typeof product === 'string' 
          ? product 
          : (product._id || (product as any).id || '');
        
        if (!productId) return;

        const vendorQuotesForProduct = getVendorQuotesForProduct(productId);
        
        // Skip products with no quotes
        if (vendorQuotesForProduct.length === 0) return;

        const selectedQuoteId = selectedQuotes.get(productId);

        // Update all quotes for this product
        vendorQuotesForProduct.forEach((vendorQuote) => {
          const quoteId = vendorQuote.quote._id || (vendorQuote.quote as any).id;
          if (!quoteId) return;

          // If this is the selected quote, mark as Accepted, otherwise Rejected
          const buyerStatus = selectedQuoteId === quoteId ? 'Accepted' : 'Rejected';
          
          updatePromises.push(
            updateBuyerQuoteStatus(token, quoteId, buyerStatus).then(() => {
              // Update local state
              setQuotes((prevQuotes) =>
                prevQuotes.map((q) => {
                  if ((q._id || (q as any).id) === quoteId) {
                    return { ...q, buyerStatus };
                  }
                  return q;
                })
              );
            })
          );
        });
      });

      await Promise.all(updatePromises);
      
      // Reload data to get updated quotes
      await loadData();
      
      // Clear selections
      setSelectedQuotes(new Map());
      
      // Show success message
      showToast({ type: 'success', message: 'Quotes submitted successfully!' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit quotes');
      console.error('Error submitting quotes:', err);
      showToast({ type: 'error', message: 'Failed to submit quotes. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptQuote = async (productId: string, quoteId: string) => {
    const token = getAuthToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const vendorQuotesForProduct = getVendorQuotesForProduct(productId);
      const updatePromises: Promise<void>[] = [];

      // Update all quotes for this product
      vendorQuotesForProduct.forEach((vendorQuote) => {
        const currentQuoteId = vendorQuote.quote._id || (vendorQuote.quote as any).id;
        if (!currentQuoteId) return;

        // If this is the selected quote, mark as Accepted, otherwise Rejected
        const buyerStatus = currentQuoteId === quoteId ? 'Accepted' : 'Rejected';
        
        updatePromises.push(
          updateBuyerQuoteStatus(token, currentQuoteId, buyerStatus).then(() => {
            // Update local state
            setQuotes((prevQuotes) =>
              prevQuotes.map((q) => {
                if ((q._id || (q as any).id) === currentQuoteId) {
                  return { ...q, buyerStatus };
                }
                return q;
              })
            );
          })
        );
      });

      await Promise.all(updatePromises);
      
      // Reload data to get updated quotes
      await loadData();
      
      // Show success message
      showToast({ type: 'success', message: 'Quote accepted successfully!' });
    } catch (err: any) {
      setError(err.message || 'Failed to accept quote');
      console.error('Error accepting quote:', err);
      showToast({ type: 'error', message: 'Failed to accept quote. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading enquiry details...</p>
        </div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-red-500 dark:text-red-400">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p className="text-red-800 dark:text-red-400 font-medium mb-2">Error loading enquiry</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{error || 'Enquiry not found'}</p>
            <button
              onClick={() => router.push('/enquiries')}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
            >
              Back to Enquiries
            </button>
          </div>
      </div>
    );
  }

  // Group quotes by product - include all enquiry products, even if they have no quotes
  const quotesByProduct = new Map<string, { quotes: Quote[], productName: string, productDetails: any }>();
  
  // First, initialize all enquiry products
  if (enquiry.enquiryProducts) {
    enquiry.enquiryProducts.forEach((enquiryProduct: any) => {
      const productId = typeof enquiryProduct === 'string' 
        ? enquiryProduct 
        : (enquiryProduct._id || enquiryProduct.id || enquiryProduct.productId || `product-${Math.random()}`);
      
      const productDetails = typeof enquiryProduct === 'object' ? enquiryProduct : null;
      const product = productDetails?.productsheetitemid || productDetails;
      const productName = product?.displayName || 
                         product?.externalRef || 
                         productDetails?.displayName ||
                         productDetails?.name || 
                         'Unknown Product';
      
      if (!quotesByProduct.has(productId)) {
        quotesByProduct.set(productId, {
          quotes: [],
          productName,
          productDetails: productDetails || product
        });
      }
    });
  }
  
  // Then, add quotes to their respective products
  quotes.forEach((quote) => {
    const assignment = quote.vendorAssignmentId as any;
    const enquiryProduct = assignment?.enquiryProductId as any;
    const product = enquiryProduct?.productsheetitemid as any;
    
    // Try to find the product ID from the enquiry product
    const productId = enquiryProduct?._id?.toString() || 
                     enquiryProduct?._id || 
                     product?._id?.toString() ||
                     product?._id || 
                     product?.id?.toString() ||
                     `product-${quote._id || Math.random()}`;
    
    if (quotesByProduct.has(productId)) {
      quotesByProduct.get(productId)!.quotes.push(quote);
    } else {
      // If product not found in enquiry products, create a new entry
      const productName = product?.displayName || product?.externalRef || 'Unknown Product';
      quotesByProduct.set(productId, {
        quotes: [quote],
        productName,
        productDetails: product
      });
    }
  });

  return (
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{enquiry.enquiryName || 'Enquiry Details'}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enquiry ID: {enquiry._id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  enquiry.enquiryStatus === 'submitted' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                  enquiry.enquiryStatus === 'draft' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                }`}>
                {enquiry.enquiryStatus || 'Draft'}
              </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('quotesRequested')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quotesRequested'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Quotes Requested
              </button>
              <button
                onClick={() => setActiveTab('quotesReceived')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quotesReceived'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Quotes Received ({quotes.length})
              </button>
              <button
                onClick={() => setActiveTab('chatWithAdmin')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'chatWithAdmin'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Chat with Admin
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'quotesRequested' && (
              <div className="space-y-6">
                {/* Products */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Products Requested</h2>
                  {enquiry.enquiryProducts && enquiry.enquiryProducts.length > 0 ? (
                    <div className="space-y-3">
                      {enquiry.enquiryProducts.map((product: any, index: number) => {
                        const productId = typeof product === 'string' ? product : (product._id || product.id || product.productId || `product-${index}`);
                        const productDetails = typeof product === 'object' ? product : null;
                        const productName = productDetails?.productsheetitemid?.displayName || 
                                          productDetails?.displayName || 
                                          productDetails?.name || 
                                          'Product ' + (index + 1);
                        const productRef = productDetails?.productsheetitemid?.externalRef || productDetails?.externalRef;

                        return (
                          <div key={productId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                  {productName}
                                </h3>
                                {productRef && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    Ref: {productRef}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                                  {productDetails?.quantity && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Quantity: </span>
                                      <span className="font-medium text-gray-900 dark:text-white">{productDetails.quantity}</span>
                                    </div>
                                  )}
                                  {productDetails?.targetUnitPrice && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Target Price: </span>
                                      <span className="font-medium text-gray-900 dark:text-white">{productDetails.targetUnitPrice}</span>
                                    </div>
                                  )}
                                  {productDetails?.deliveryDate && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Delivery Date: </span>
                                      <span className="font-medium text-gray-900 dark:text-white">{formatDate(productDetails.deliveryDate)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-gray-600 dark:text-gray-400">No products added to this enquiry</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'quotesReceived' && (
              <div className="space-y-6">
                {!enquiry || !enquiry.enquiryProducts || enquiry.enquiryProducts.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No products in this enquiry</p>
                  </div>
                ) : (
                  <>
                  {                  enquiry.enquiryProducts.map((product: any, index: number) => {
                    const productId = typeof product === 'string' ? product : (product._id || (product as any).id || `product-${index}`);
                    const productDetails = getProductDetails(product);
                    const vendorQuotesForProduct = getVendorQuotesForProduct(productId);
                    const quoteCount = vendorQuotesForProduct.length;
                    const selectedQuoteId = getSelectedQuoteForProduct(productId, vendorQuotesForProduct);
                    const hasSelectedQuote = selectedQuoteId !== null;

                    return (
                      <div key={productId} className="grid grid-cols-7 gap-6">
                        {/* Left Column - Product Details */}
                        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 p-6">
                          {!productDetails ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              <p>Product details unavailable</p>
                            </div>
                          ) : (
                          <div className="space-y-4">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {productDetails.imageLink ? (
                                <img
                                  src={productDetails.imageLink}
                                  alt={productDetails.displayName}
                                  className="w-32 h-32 object-cover rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-product.jpg';
                                  }}
                                />
                              ) : (
                                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                  <svg
                                    width="40"
                                    height="40"
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
                            </div>

                            {/* Product Name */}
                            <div className="mb-3">
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {productDetails.displayName}
                              </h3>
                              <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                                  {quoteCount} quotes
                                </button>
                                {quoteCount > 0 && (
                                  <button className="px-3 py-1.5 bg-green-500 dark:bg-green-500 text-white rounded-lg text-sm font-medium">
                                    Selected
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {productDetails.description}
                              </p>
                            </div>

                            {/* Quantity and Target Price Row */}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-700 dark:text-gray-300">Qty: </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {productDetails.quantity}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">•</span>
                              <span className="text-gray-700 dark:text-gray-300">Target: </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                ${productDetails.targetPrice}/unit
                              </span>
                            </div>

                            {/* Need By Date */}
                            <div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Need by: </span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatDate(productDetails.needByDate)}
                              </span>
                            </div>
                          </div>
                        )}
                        </div>

                        {/* Right Column - Quote Comparison Table */}
                        <div className="col-span-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                          {vendorQuotesForProduct.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500 dark:text-gray-400">No quotes received for this product</p>
                            </div>
                          ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="text-left text-sm font-medium text-gray-700 dark:text-gray-300 pb-3 pr-4">
                                    Field
                                  </th>
                                  {vendorQuotesForProduct.map((vendorQuote) => {
                                    const quoteId = vendorQuote.quote._id || (vendorQuote.quote as any).id;
                                    // Use buyerStatus from the quote object to determine if this quote is selected
                                    const buyerStatus = vendorQuote.quote.buyerStatus?.toLowerCase();
                                    return (
                                      <th key={vendorQuote.vendorId} className="text-center pb-3 px-2">
                                        <div className="flex flex-col items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {vendorQuote.vendorName}
                                          </span>
                                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                            buyerStatus === 'accepted' 
                                              ? 'bg-green-500 dark:bg-green-500 text-white' 
                                              : buyerStatus === 'rejected' 
                                              ? 'bg-red-500 dark:bg-red-500 text-white' 
                                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                          }`}>
                                            {buyerStatus === 'accepted' ? 'Accepted' : buyerStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                          </span>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {/* Price Row */}
                                <tr>
                                  <td className="py-4 pr-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                      </svg>
                                      <span>Price</span>
                                    </div>
                                  </td>
                                  {vendorQuotesForProduct.map((vendorQuote) => (
                                    <td key={vendorQuote.vendorId} className="py-4 px-2 text-center">
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        ${vendorQuote.quote.unitPrice || 'N/A'}/unit
                                      </span>
                                    </td>
                                  ))}
                                </tr>

                                {/* Delivery Row */}
                                <tr>
                                  <td className="py-4 pr-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
                                        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"></path>
                                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                      </svg>
                                      <span>Delivery</span>
                                    </div>
                                  </td>
                                  {vendorQuotesForProduct.map((vendorQuote) => {
                                    const deliveryDate = vendorQuote.quote.deliveryDate;
                                    let deliveryText = 'N/A';
                                    if (deliveryDate) {
                                      try {
                                        const date = new Date(deliveryDate);
                                        const today = new Date();
                                        const diffTime = date.getTime() - today.getTime();
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        deliveryText = diffDays > 0 ? `${diffDays} days` : 'Today';
                                      } catch {
                                        deliveryText = formatDate(deliveryDate);
                                      }
                                    }
                                    return (
                                      <td key={vendorQuote.vendorId} className="py-4 px-2 text-center">
                                        <span className="text-sm text-gray-900 dark:text-white">
                                          {deliveryText}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>

                                {/* Negotiable Row */}
                                <tr>
                                  <td className="py-4 pr-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                      </svg>
                                      <span>Negotiable</span>
                                    </div>
                                  </td>
                                  {vendorQuotesForProduct.map((vendorQuote) => {
                                    // Determine if negotiable - check if there's a description or set default
                                    const isNegotiable = vendorQuote.quote.description && vendorQuote.quote.description.length > 0;
                                    return (
                                      <td key={vendorQuote.vendorId} className="py-4 px-2 text-center">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                          {isNegotiable ? 'Yes' : 'No'}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </tr>

                                {/* Select Row - Only show if no quote has accepted buyerStatus for this product */}
                                {!hasSelectedQuote && (
                                  <tr>
                                    <td className="py-4 pr-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Select
                                    </td>
                                    {vendorQuotesForProduct.map((vendorQuote) => {
                                      const quoteId = vendorQuote.quote._id || (vendorQuote.quote as any).id;
                                      const isSelected = selectedQuotes.get(productId) === quoteId;
                                      return (
                                        <td key={vendorQuote.vendorId} className="py-4 px-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              handleQuoteSelect(productId, quoteId);
                                            }}
                                            disabled={isSubmitting}
                                            className={`w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded-full focus:ring-teal-500 dark:focus:ring-teal-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 ${
                                              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                            }`}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                )}

                              </tbody>
                            </table>
                          </div>
                        )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Submit Button */}
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleSubmitQuotes}
                      disabled={isSubmitting || selectedQuotes.size === 0}
                      className={`px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        isSubmitting || selectedQuotes.size === 0
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
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
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          <span>Submit Quotes</span>
                        </>
                      )}
                    </button>
                  </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'chatWithAdmin' && (
              <div>
                {/* Chat with Admin content will be added here */}
              </div>
            )}
          </div>
      </div>
  );
}
