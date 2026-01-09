'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { getAuthToken, clearAuthToken } from '@/lib/storage';
import { getCurrentUser, type CurrentUser, getBuyerProfile, updateBuyerProfile, type BuyerProfile, type ContactDetail, type Address, type BankDetails, type BusinessInformation, uploadFile } from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function BuyerProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  // Form state
  const [legalEntityName, setLegalEntityName] = useState('');
  const [website, setWebsite] = useState('');
  const [contactDetails, setContactDetails] = useState<ContactDetail[]>([{ contactPerson: '', email: '', phone: '', designation: '' }]);
  const [bankDetails, setBankDetails] = useState<BankDetails[]>([{ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
  const [billingAddress, setBillingAddress] = useState<Address[]>([{ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
  const [shippingAddress, setShippingAddress] = useState<Address[]>([{ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
  const [businessInformation, setBusinessInformation] = useState<BusinessInformation>({
    businessName: '',
    legalEntityType: '',
    gstNumber: '',
    panNumber: '',
    businessDocuments: [],
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const user = await getCurrentUser(token);
        setCurrentUser(user);

        const buyerProfile = await getBuyerProfile(token);
        setProfile(buyerProfile);

        if (buyerProfile) {
          setLegalEntityName(buyerProfile.legalEntityName || '');
          setWebsite(buyerProfile.website || '');
          setContactDetails(buyerProfile.contactDetails && buyerProfile.contactDetails.length > 0 ? buyerProfile.contactDetails : [{ contactPerson: '', email: '', phone: '', designation: '' }]);
          setBankDetails(buyerProfile.bankDetails && buyerProfile.bankDetails.length > 0 ? buyerProfile.bankDetails : [{ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
          setBillingAddress(buyerProfile.billingAddress && buyerProfile.billingAddress.length > 0 ? buyerProfile.billingAddress : [{ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
          setShippingAddress(buyerProfile.shippingAddress && buyerProfile.shippingAddress.length > 0 ? buyerProfile.shippingAddress : [{ addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
          setBusinessInformation(buyerProfile.businessInformation || { businessName: '', legalEntityType: '', gstNumber: '', panNumber: '', businessDocuments: [] });
        }
      } catch (error: any) {
        console.error('Error loading profile:', error);
        showToast({
          type: 'error',
          message: error?.message || 'Failed to load profile. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleContactDetailChange = (index: number, field: keyof ContactDetail, value: string) => {
    const updated = [...contactDetails];
    updated[index] = { ...updated[index], [field]: value };
    setContactDetails(updated);
  };

  const addContactDetail = () => {
    setContactDetails([...contactDetails, { contactPerson: '', email: '', phone: '', designation: '' }]);
  };

  const removeContactDetail = (index: number) => {
    if (contactDetails.length > 1) {
      setContactDetails(contactDetails.filter((_, i) => i !== index));
    }
  };

  const handleBankDetailChange = (index: number, field: keyof BankDetails, value: string) => {
    const updated = [...bankDetails];
    updated[index] = { ...updated[index], [field]: value };
    setBankDetails(updated);
  };

  const addBankDetail = () => {
    setBankDetails([...bankDetails, { bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '' }]);
  };

  const removeBankDetail = (index: number) => {
    if (bankDetails.length > 1) {
      setBankDetails(bankDetails.filter((_, i) => i !== index));
    }
  };

  const handleBillingAddressChange = (index: number, field: keyof Address, value: string) => {
    const updated = [...billingAddress];
    updated[index] = { ...updated[index], [field]: value };
    setBillingAddress(updated);
  };

  const addBillingAddress = () => {
    setBillingAddress([...billingAddress, { addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
  };

  const removeBillingAddress = (index: number) => {
    if (billingAddress.length > 1) {
      setBillingAddress(billingAddress.filter((_, i) => i !== index));
    }
  };

  const handleShippingAddressChange = (index: number, field: keyof Address, value: string) => {
    const updated = [...shippingAddress];
    updated[index] = { ...updated[index], [field]: value };
    setShippingAddress(updated);
  };

  const addShippingAddress = () => {
    setShippingAddress([...shippingAddress, { addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '' }]);
  };

  const removeShippingAddress = (index: number) => {
    if (shippingAddress.length > 1) {
      setShippingAddress(shippingAddress.filter((_, i) => i !== index));
    }
  };

  const handleBusinessInformationChange = (field: keyof BusinessInformation, value: string | string[]) => {
    setBusinessInformation((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDocumentClick = () => {
    setShowDocumentForm(true);
    setDocumentType('');
    setDocumentNumber('');
    setSelectedDocumentFile(null);
  };

  const handleDocumentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast({
          type: 'error',
          message: 'File size must be less than 10MB.',
        });
        return;
      }
      setSelectedDocumentFile(file);
    }
  };

  const handleDocumentDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast({
          type: 'error',
          message: 'File size must be less than 10MB.',
        });
        return;
      }
      setSelectedDocumentFile(file);
    }
  };

  const handleDocumentDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSaveDocument = async () => {
    if (!selectedDocumentFile) {
      showToast({
        type: 'error',
        message: 'Please select a file to upload.',
      });
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showToast({
        type: 'error',
        message: 'Please log in to upload documents.',
      });
      return;
    }

    try {
      setIsUploadingDocument(true);
      const { url } = await uploadFile(token, selectedDocumentFile, 'buyer-business-documents');
      
      const newDocument = {
        documentType: documentType.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        documentUrl: url,
      };

      setBusinessInformation((prev) => ({
        ...prev,
        businessDocuments: [...(prev.businessDocuments || []), newDocument],
      }));

      showToast({ type: 'success', message: 'Document uploaded successfully.' });
      setShowDocumentForm(false);
      setDocumentType('');
      setDocumentNumber('');
      setSelectedDocumentFile(null);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showToast({
        type: 'error',
        message: error?.message || 'Failed to upload document. Please try again.',
      });
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleCancelDocumentForm = () => {
    setShowDocumentForm(false);
    setDocumentType('');
    setDocumentNumber('');
    setSelectedDocumentFile(null);
  };

  const handleRemoveDocument = (index: number) => {
    setBusinessInformation((prev) => ({
      ...prev,
      businessDocuments: prev.businessDocuments?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      setIsSaving(true);

      // Filter out empty contact details
      const validContactDetails = contactDetails.filter(
        (cd) => cd.contactPerson.trim() && cd.email.trim() && cd.phone.trim()
      );

      // Check if businessInformation has any data to save
      const hasBusinessInfo = 
        businessInformation.businessName?.trim() ||
        businessInformation.legalEntityType?.trim() ||
        businessInformation.gstNumber?.trim() ||
        businessInformation.panNumber?.trim() ||
        (businessInformation.businessDocuments && businessInformation.businessDocuments.length > 0);

      const updatedProfile = await updateBuyerProfile(token, {
        legalEntityName: legalEntityName.trim() || undefined,
        website: website.trim() || undefined,
        contactDetails: validContactDetails.length > 0 ? validContactDetails : undefined,
        bankDetails: bankDetails.some(bd => Object.values(bd).some(v => v?.trim())) ? bankDetails : undefined,
        billingAddress: billingAddress.some(ba => Object.values(ba).some(v => v?.trim())) ? billingAddress : undefined,
        shippingAddress: shippingAddress.some(sa => Object.values(sa).some(v => v?.trim())) ? shippingAddress : undefined,
        businessInformation: hasBusinessInfo ? businessInformation : undefined,
      });

      setProfile(updatedProfile);
      showToast({ type: 'success', message: 'Profile updated successfully.' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      showToast({
        type: 'error',
        message: error?.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    router.push('/login');
  };

  return (
    <main className="flex h-screen w-full bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        onNewChat={() => router.push('/')}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onLogout={handleLogout}
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={() => {}}
        onSessionDelete={() => {}}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button (Mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
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
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-gray-700 dark:text-gray-300 font-medium">
              Welcome, {currentUser?.name || 'Client'}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-6 py-6">

              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  Loading profile...
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Legal Entity Name & Website */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Overview</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Legal Entity Name
                        </label>
                        <input
                          type="text"
                          value={legalEntityName}
                          onChange={(e) => setLegalEntityName(e.target.value)}
                          placeholder="Enter legal entity name"
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Website
                        </label>
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Details</h2>
                      <button
                        type="button"
                        onClick={addContactDetail}
                        className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 rounded-lg text-white transition-colors"
                      >
                        + Add Contact
                      </button>
                    </div>
                    <div className="space-y-4">
                      {contactDetails.map((contact, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact {index + 1}</h3>
                            {contactDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContactDetail(index)}
                                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                              <input
                                type="text"
                                value={contact.contactPerson}
                                onChange={(e) => handleContactDetailChange(index, 'contactPerson', e.target.value)}
                                placeholder="Full name"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
                              <input
                                type="text"
                                value={contact.designation || ''}
                                onChange={(e) => handleContactDetailChange(index, 'designation', e.target.value)}
                                placeholder="Job title"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                              <input
                                type="email"
                                value={contact.email}
                                onChange={(e) => handleContactDetailChange(index, 'email', e.target.value)}
                                placeholder="email@example.com"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                              <input
                                type="tel"
                                value={contact.phone}
                                onChange={(e) => handleContactDetailChange(index, 'phone', e.target.value)}
                                placeholder="Phone number"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Details</h2>
                      <button
                        type="button"
                        onClick={addBankDetail}
                        className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 rounded-lg text-white transition-colors"
                      >
                        + Add Bank
                      </button>
                    </div>
                    <div className="space-y-4">
                      {bankDetails.map((bank, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bank {index + 1}</h3>
                            {bankDetails.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBankDetail(index)}
                                className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                              <input
                                type="text"
                                value={bank.bankName || ''}
                                onChange={(e) => handleBankDetailChange(index, 'bankName', e.target.value)}
                                placeholder="Bank name"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Holder Name</label>
                              <input
                                type="text"
                                value={bank.accountHolderName || ''}
                                onChange={(e) => handleBankDetailChange(index, 'accountHolderName', e.target.value)}
                                placeholder="Account holder name"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                              <input
                                type="text"
                                value={bank.accountNumber || ''}
                                onChange={(e) => handleBankDetailChange(index, 'accountNumber', e.target.value)}
                                placeholder="Account number"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">IFSC Code</label>
                              <input
                                type="text"
                                value={bank.ifscCode || ''}
                                onChange={(e) => handleBankDetailChange(index, 'ifscCode', e.target.value)}
                                placeholder="IFSC code"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

              {/* Billing Address */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Address</h2>
                  <button
                    type="button"
                    onClick={addBillingAddress}
                    className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 rounded-lg text-white transition-colors"
                  >
                    + Add Address
                  </button>
                </div>
                <div className="space-y-4">
                  {billingAddress.map((address, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Address {index + 1}</h3>
                        {billingAddress.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBillingAddress(index)}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                          <input
                            type="text"
                            value={address.addressLine1}
                            onChange={(e) => handleBillingAddressChange(index, 'addressLine1', e.target.value)}
                            placeholder="Street address"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                          <input
                            type="text"
                            value={address.addressLine2 || ''}
                            onChange={(e) => handleBillingAddressChange(index, 'addressLine2', e.target.value)}
                            placeholder="Apartment, suite, etc."
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                            <input
                              type="text"
                              value={address.city}
                              onChange={(e) => handleBillingAddressChange(index, 'city', e.target.value)}
                              placeholder="City"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                            <input
                              type="text"
                              value={address.state}
                              onChange={(e) => handleBillingAddressChange(index, 'state', e.target.value)}
                              placeholder="State"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                            <input
                              type="text"
                              value={address.zipCode}
                              onChange={(e) => handleBillingAddressChange(index, 'zipCode', e.target.value)}
                              placeholder="ZIP code"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                            <input
                              type="text"
                              value={address.country}
                              onChange={(e) => handleBillingAddressChange(index, 'country', e.target.value)}
                              placeholder="Country"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Shipping Address</h2>
                  <button
                    type="button"
                    onClick={addShippingAddress}
                    className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 rounded-lg text-white transition-colors"
                  >
                    + Add Address
                  </button>
                </div>
                <div className="space-y-4">
                  {shippingAddress.map((address, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Address {index + 1}</h3>
                        {shippingAddress.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeShippingAddress(index)}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                          <input
                            type="text"
                            value={address.addressLine1}
                            onChange={(e) => handleShippingAddressChange(index, 'addressLine1', e.target.value)}
                            placeholder="Street address"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                          <input
                            type="text"
                            value={address.addressLine2 || ''}
                            onChange={(e) => handleShippingAddressChange(index, 'addressLine2', e.target.value)}
                            placeholder="Apartment, suite, etc."
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                            <input
                              type="text"
                              value={address.city}
                              onChange={(e) => handleShippingAddressChange(index, 'city', e.target.value)}
                              placeholder="City"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                            <input
                              type="text"
                              value={address.state}
                              onChange={(e) => handleShippingAddressChange(index, 'state', e.target.value)}
                              placeholder="State"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP Code</label>
                            <input
                              type="text"
                              value={address.zipCode}
                              onChange={(e) => handleShippingAddressChange(index, 'zipCode', e.target.value)}
                              placeholder="ZIP code"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                            <input
                              type="text"
                              value={address.country}
                              onChange={(e) => handleShippingAddressChange(index, 'country', e.target.value)}
                              placeholder="Country"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Information */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Business Information</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Your registered business details.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessInformation.businessName || ''}
                      onChange={(e) => handleBusinessInformationChange('businessName', e.target.value)}
                      placeholder="Enter business name"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Legal Entity Type
                    </label>
                    <input
                      type="text"
                      value={businessInformation.legalEntityType || ''}
                      onChange={(e) => handleBusinessInformationChange('legalEntityType', e.target.value)}
                      placeholder="e.g., Private Limited"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={businessInformation.gstNumber || ''}
                      onChange={(e) => handleBusinessInformationChange('gstNumber', e.target.value)}
                      placeholder="Enter GST number"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={businessInformation.panNumber || ''}
                      onChange={(e) => handleBusinessInformationChange('panNumber', e.target.value)}
                      placeholder="Enter PAN number"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Business Documents */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Business Documents</h3>
                    {!showDocumentForm && (
                      <button
                        type="button"
                        onClick={handleAddDocumentClick}
                        className="inline-flex items-center px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
                      >
                        + Add Document
                      </button>
                    )}
                  </div>
                  
                  {showDocumentForm && (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="space-y-4">
                        {/* Document Type and Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Type of Document
                            </label>
                            <select
                              value={documentType}
                              onChange={(e) => setDocumentType(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              <option value="">Select document type</option>
                              <option value="GST Certificate">GST Certificate</option>
                              <option value="PAN Card">PAN Card</option>
                              <option value="Company Registration">Company Registration</option>
                              <option value="Trade License">Trade License</option>
                              <option value="Bank Statement">Bank Statement</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Document Number
                            </label>
                            <input
                              type="text"
                              value={documentNumber}
                              onChange={(e) => setDocumentNumber(e.target.value)}
                              placeholder="Enter document number"
                              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Document Upload Area */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Document Upload
                          </label>
                          <div
                            onDrop={handleDocumentDrop}
                            onDragOver={handleDocumentDragOver}
                            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-teal-500 dark:hover:border-teal-500 transition-colors cursor-pointer"
                          >
                            <input
                              type="file"
                              onChange={handleDocumentFileSelect}
                              className="hidden"
                              id="document-upload"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <label htmlFor="document-upload" className="cursor-pointer">
                              <div className="flex flex-col items-center">
                                <svg
                                  width="48"
                                  height="48"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-gray-400 dark:text-gray-500 mb-3"
                                >
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Any file type (MAX. 10MB)
                                </p>
                                {selectedDocumentFile && (
                                  <p className="text-sm text-teal-600 dark:text-teal-400 mt-2">
                                    Selected: {selectedDocumentFile.name}
                                  </p>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={handleCancelDocumentForm}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDocument}
                            disabled={!selectedDocumentFile || isUploadingDocument}
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                          >
                            {isUploadingDocument ? 'Uploading...' : 'Upload Document'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {businessInformation.businessDocuments && businessInformation.businessDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {businessInformation.businessDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1 mr-2">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc.documentType || `Document ${index + 1}`}
                            </div>
                            {doc.documentNumber && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                Number: {doc.documentNumber}
                              </div>
                            )}
                            {doc.documentUrl && (
                              <a
                                href={doc.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-1 block"
                              >
                                View Document
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(index)}
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !showDocumentForm && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No documents added yet. Click "Add Document" to upload business documents.
                      </p>
                    )
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
