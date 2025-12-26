'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getAuthToken } from '@/lib/storage';
import { getCurrentUser, getEnquiry, getBuyerQuotes, type CurrentUser, type Enquiry, type Quote } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { requireAuth } from '@/lib/auth';

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const enquiryId = params?.id as string;

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'quotesRequested' | 'quotesReceived'>('quotesRequested');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set()); // Keep for quotes received tab

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

      const user = await getCurrentUser(token);
      setCurrentUser(user);

      // Load enquiry details
      const enquiryData = await getEnquiry(token, enquiryId);
      setEnquiry(enquiryData);

      // Load all quotes and filter by enquiry ID
      const allQuotes = await getBuyerQuotes(token);
      const enquiryQuotes = allQuotes.filter((quote) => {
        const assignment = quote.vendorAssignmentId as any;
        const enquiryProduct = assignment?.enquiryProductId as any;
        // Handle both populated and non-populated enquiryId
        const quoteEnquiryId = enquiryProduct?.enquiryId?._id?.toString() || 
                               enquiryProduct?.enquiryId?.toString() ||
                               enquiryProduct?.enquiryId;
        return quoteEnquiryId === enquiryId;
      });
      setQuotes(enquiryQuotes);
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

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  const handleNewChat = () => {
    router.push('/');
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

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          onNewChat={handleNewChat}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
          onLogout={handleLogout}
          sessions={[]}
          currentSessionId={null}
          onSessionSelect={() => {}}
          onSessionDelete={() => {}}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Loading enquiry details...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          onNewChat={handleNewChat}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          currentUser={currentUser}
          onLogout={handleLogout}
          sessions={[]}
          currentSessionId={null}
          onSessionSelect={() => {}}
          onSessionDelete={() => {}}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-red-500">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="text-red-800 font-medium mb-2">Error loading enquiry</p>
              <p className="text-red-600 text-sm">{error || 'Enquiry not found'}</p>
              <button
                onClick={() => router.push('/enquiries')}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
              >
                Back to Enquiries
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Group quotes by product - ensure all quotes are included
  const quotesByProduct = new Map<string, Quote[]>();
  quotes.forEach((quote) => {
    const assignment = quote.vendorAssignmentId as any;
    const enquiryProduct = assignment?.enquiryProductId as any;
    const product = enquiryProduct?.productsheetitemid as any;
    // Use product ID or create a unique key if product is missing
    const productId = product?._id?.toString() || 
                     product?._id || 
                     product?.id?.toString() ||
                     `product-${quote._id || Math.random()}`;
    if (!quotesByProduct.has(productId)) {
      quotesByProduct.set(productId, []);
    }
    quotesByProduct.get(productId)!.push(quote);
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        sessions={[]}
        currentSessionId={null}
        onSessionSelect={() => {}}
        onSessionDelete={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/enquiries')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  aria-label="Back to enquiries"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{enquiry.enquiryName || 'Enquiry Details'}</h1>
                  <p className="text-sm text-gray-500 mt-1">Enquiry ID: {enquiry._id}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                enquiry.enquiryStatus === 'submitted' ? 'bg-blue-100 text-blue-800' :
                enquiry.enquiryStatus === 'draft' ? 'bg-gray-100 text-gray-800' :
                'bg-green-100 text-green-800'
              }`}>
                {enquiry.enquiryStatus || 'Draft'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('quotesRequested')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quotesRequested'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Quotes Requested
              </button>
              <button
                onClick={() => setActiveTab('quotesReceived')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'quotesReceived'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Quotes Received ({quotes.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'quotesRequested' && (
              <div className="space-y-6">
                {/* Products */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Products Requested</h2>
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
                          <div key={productId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">
                                  {productName}
                                </h3>
                                {productRef && (
                                  <p className="text-sm text-gray-500 mb-2">
                                    Ref: {productRef}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                                  {productDetails?.quantity && (
                                    <div>
                                      <span className="text-gray-500">Quantity: </span>
                                      <span className="font-medium text-gray-900">{productDetails.quantity}</span>
                                    </div>
                                  )}
                                  {productDetails?.targetUnitPrice && (
                                    <div>
                                      <span className="text-gray-500">Target Price: </span>
                                      <span className="font-medium text-gray-900">{productDetails.targetUnitPrice}</span>
                                    </div>
                                  )}
                                  {productDetails?.deliveryDate && (
                                    <div>
                                      <span className="text-gray-500">Delivery Date: </span>
                                      <span className="font-medium text-gray-900">{formatDate(productDetails.deliveryDate)}</span>
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
                      <p>No products added to this enquiry</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'quotesReceived' && (
              <div>
                {quotes.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <p className="text-gray-600 text-lg">No quotes received yet</p>
                    <p className="text-gray-400 text-sm mt-2">Quotes sent by vendors will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from(quotesByProduct.entries()).map(([productId, productQuotes]) => {
                      const firstQuote = productQuotes[0];
                      const assignment = firstQuote.vendorAssignmentId as any;
                      const enquiryProduct = assignment?.enquiryProductId as any;
                      const product = enquiryProduct?.productsheetitemid as any;
                      const productName = product?.displayName || product?.externalRef || 'Unknown Product';
                      const isExpanded = expandedProducts.has(productId);

                      return (
                        <div key={productId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleProduct(productId)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              >
                                <polyline points="9 18 15 12 9 6"></polyline>
                              </svg>
                              <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
                              <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                                {productQuotes.length} {productQuotes.length === 1 ? 'quote' : 'quotes'}
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-200 p-4 space-y-3">
                              {productQuotes.map((quote) => {
                                const quoteAssignment = quote.vendorAssignmentId as any;
                                const vendor = quoteAssignment?.vendorId as any;

                                return (
                                  <div key={quote._id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                          quote.quoteStatus === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                          quote.quoteStatus === 'Accepted' ? 'bg-green-100 text-green-800' :
                                          quote.quoteStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {quote.quoteStatus}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                          {vendor?.auth?.name || 'Unknown Vendor'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-gray-500">Unit Price</p>
                                        <p className="font-medium text-gray-900">{quote.unitPrice || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Delivery Date</p>
                                        <p className="font-medium text-gray-900">
                                          {quote.deliveryDate ? formatDate(quote.deliveryDate) : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Valid Till</p>
                                        <p className="font-medium text-gray-900">
                                          {quote.validTill ? formatDate(quote.validTill) : 'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Submitted</p>
                                        <p className="font-medium text-gray-900">
                                          {quote.createdAt ? formatDate(quote.createdAt) : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    {quote.description && (
                                      <div className="mt-3">
                                        <p className="text-sm text-gray-500 mb-1">Description</p>
                                        <p className="text-sm text-gray-900">{quote.description}</p>
                                      </div>
                                    )}
                                    {quote.attachment && (
                                      <div className="mt-4">
                                        <a
                                          href={quote.attachment}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-2"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                          </svg>
                                          View Attachment
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

