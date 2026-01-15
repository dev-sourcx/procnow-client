"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatContainer from "@/components/ChatContainer";
import DiscoverFilters from "@/components/DiscoverFilters";
import {
  getChatSessions,
  ChatSession as BackendChatSession,
  generateFieldsFromDescription,
  GeneratedFieldsResponse,
  uploadFile,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import {
  getAuthToken,
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
} from "@/lib/storage";
import CreatableSelect from "@/components/CreatableSelect";
import { requireAuth } from "@/lib/auth";
import type { Product } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<"discover" | "specify">(
    "discover"
  );

  // Brief/Specify mode state
  const [activeTab, setActiveTab] = useState<"add">("add");
  const [itemInput, setItemInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedFields, setGeneratedFields] =
    useState<GeneratedFieldsResponse | null>(null);
  const [formData, setFormData] = useState<
    Record<string, string | number | File | null | string[]>
  >({});
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState<BriefProduct[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquiryName, setEnquiryName] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
    email: "",
  });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(
    null
  );
  const [modalProducts, setModalProducts] = useState<BriefProduct[]>([]);
  const [productQuantities, setProductQuantities] = useState<
    Record<string, number>
  >({});
  const [productDeliveryDates, setProductDeliveryDates] = useState<
    Record<string, string>
  >({});
  const [productTargetPrices, setProductTargetPrices] = useState<
    Record<string, number>
  >({});
  const [customFields, setCustomFields] = useState<
    Array<{
      id: string;
      label: string;
      type: "text" | "number" | "textarea" | "dropdown" | "file";
      options?: string[];
      value: string | number | File | null | string[];
    }>
  >([]);
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<
    "text" | "number" | "textarea" | "dropdown" | "file"
  >("dropdown");
  const [newFieldOptions, setNewFieldOptions] = useState<string>("");
  const [enquiryProductsUpdate, setEnquiryProductsUpdate] = useState(0);
  const [expandedEnquiries, setExpandedEnquiries] = useState<
    Record<string, boolean>
  >({});
  const [customValues, setCustomValues] = useState<Record<string, string[]>>(
    {}
  );
  const [dropdownSearch, setDropdownSearch] = useState<Record<string, string>>(
    {}
  );
  const [dropdownOpen, setDropdownOpen] = useState<Record<string, boolean>>({});
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [specModalItems, setSpecModalItems] = useState<string[]>([]);
  const [specModalTitle, setSpecModalTitle] =
    useState<string>("Specifications");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);
  const [discoverFilterMeta, setDiscoverFilterMeta] = useState<Record<string, string[]> | null>(null);
  const [discoverSelectedFilters, setDiscoverSelectedFilters] = useState<Record<string, string[]>>({});
  const [discoverProducts, setDiscoverProducts] = useState<Product[]>([]);

  // Load sessions for ChatContainer
  useEffect(() => {
    const loadSessions = async () => {
      const token = getAuthToken();
      if (!token) {
        // Load guest session from localStorage
        const guestSession = getGuestSession();
        if (guestSession) {
          setSessions([guestSession]);
          setCurrentSessionId(guestSession.id);
        } else {
          setSessions([]);
          setCurrentSessionId(null);
        }
        return;
      }

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

        // If a session was selected via layout/sidebar, prefer that
        try {
          const selectedSessionId = sessionStorage.getItem("selected_session_id");
          if (selectedSessionId) {
            setCurrentSessionId(selectedSessionId);
            return;
          }
        } catch {
          // ignore storage read errors
        }

        // If there is a guest session from before login, prefer showing that first
        const guestSession = getGuestSession();
        if (guestSession) {
          // Use the guest session ID so ChatContainer can load its messages from localStorage
          setCurrentSessionId(guestSession.id);
        } else {
          // Fallback: if we have a synced session id from login, select that
          const syncedSessionId = sessionStorage.getItem("synced_session_id");
          if (syncedSessionId) {
            const syncedSession = convertedSessions.find(
              (s) => s.id === syncedSessionId
            );
            if (syncedSession) {
              setCurrentSessionId(syncedSessionId);
            }
            sessionStorage.removeItem("synced_session_id");
          }
        }
      } catch (error) {
        console.error("Error loading sessions from backend:", error);
        // On error, try guest session
        const guestSession = getGuestSession();
        if (guestSession) {
          setSessions([guestSession]);
          setCurrentSessionId(guestSession.id);
        } else {
          setSessions([]);
        }
      }
    };

    loadSessions();
  }, []);

  // Listen for session selection from DashboardLayout/Sidebar
  useEffect(() => {
    const handleSessionSelected = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sessionId?: string };
      if (detail?.sessionId) {
        setCurrentSessionId(detail.sessionId);
      }
    };
    const handleSessionDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sessionId?: string };
      if (detail?.sessionId && currentSessionId === detail.sessionId) {
        setCurrentSessionId(null);
      }
    };
    const handleNewChatStarted = () => {
      // Clear current session when new chat is started
      setCurrentSessionId(null);
      // Clear filters and products
      setDiscoverFilterMeta(null);
      setDiscoverSelectedFilters({});
      setDiscoverProducts([]);
      setIsFilterCollapsed(false);
    };
    const handleToggleFilters = () => {
      // Toggle filter sidebar when event is dispatched from layout
      setIsFilterOpen((prev) => !prev);
    };
    window.addEventListener("chatSessionSelected", handleSessionSelected as EventListener);
    window.addEventListener("chatSessionDeleted", handleSessionDeleted as EventListener);
    window.addEventListener("newChatStarted", handleNewChatStarted as EventListener);
    window.addEventListener("toggleFilters", handleToggleFilters as EventListener);
    return () => {
      window.removeEventListener("chatSessionSelected", handleSessionSelected as EventListener);
      window.removeEventListener("chatSessionDeleted", handleSessionDeleted as EventListener);
      window.removeEventListener("newChatStarted", handleNewChatStarted as EventListener);
      window.removeEventListener("toggleFilters", handleToggleFilters as EventListener);
    };
  }, [currentSessionId]);

  // Clear filters when session changes
  useEffect(() => {
    setDiscoverFilterMeta(null);
    setDiscoverSelectedFilters({});
    setDiscoverProducts([]);
    setIsFilterCollapsed(false);
  }, [currentSessionId]);

  // Dispatch event when filters are available or cleared
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasFilters = discoverFilterMeta !== null && Object.keys(discoverFilterMeta).length > 0;
      window.dispatchEvent(new CustomEvent('filtersAvailable', { 
        detail: { hasFilters } 
      }));
    }
  }, [discoverFilterMeta]);

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

  const handleDiscoverProductsUpdate = (data: { products: Product[]; filters?: Record<string, string[]> }) => {
    const { products, filters } = data;
    
    if (!products || products.length === 0) {
      setDiscoverProducts([]);
      setDiscoverFilterMeta(null);
      return;
    }

    // Store products
    setDiscoverProducts(products);

    // Store filters from API response (if provided)
    if (filters && Object.keys(filters).length > 0) {
      setDiscoverFilterMeta(filters);
    } else {
      // Fallback: Generate filters from products if API doesn't provide them
      const categories = Array.from(
        new Set(
          products.map((p) => p.product_category).filter((c): c is string => !!c)
        )
      );

      const storagesSet = new Set<string>();
      const prices: string[] = [];

      products.forEach((p) => {
        const attrs = p.dynamic_attributes || {};
        const storage =
          attrs["Storage"] || attrs["Capacity"] || attrs["Storage Capacity"];
        if (storage) {
          storagesSet.add(storage);
        }

        const priceStr = attrs["Price"] || attrs["Offer Price"] || attrs["MRP"];
        if (priceStr) {
          prices.push(priceStr);
        }
      });

      setDiscoverFilterMeta({
        categories: categories.length > 0 ? categories : undefined,
        storage: Array.from(storagesSet).length > 0 ? Array.from(storagesSet) : undefined,
        price: prices.length > 0 ? prices : undefined,
      } as Record<string, string[]>);
    }
  };

  // Convert selected filters to comma-separated string for input box
  const getSelectedFiltersAsString = (): string => {
    if (!discoverSelectedFilters || Object.keys(discoverSelectedFilters).length === 0) {
      return '';
    }

    const allSelectedValues: string[] = [];
    Object.values(discoverSelectedFilters).forEach((values) => {
      if (Array.isArray(values)) {
        allSelectedValues.push(...values);
      }
    });

    return allSelectedValues.join(', ');
  };

  // Brief/Specify mode handlers
  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  const loadEnquiries = () => {
    const storedEnquiries = getStoredEnquiries();
    setEnquiries(storedEnquiries);
    window.dispatchEvent(new Event("enquiryUpdated"));
  };

  useEffect(() => {
    if (activeMode === "specify") {
      loadProducts();
      loadEnquiries();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "brief_products") {
          loadProducts();
        }
        if (e.key === "brief_enquiries") {
          loadEnquiries();
        }
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("productAdded", loadProducts);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener("productAdded", loadProducts);
      };
    }
  }, [activeMode]);

  const handleGenerateWithAI = async () => {
    if (!itemInput.trim()) {
      showToast({ type: "error", message: "Please enter an item name" });
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

      const defaultFields: GeneratedFieldsResponse["fields"] = [
        {
          label: "Description",
          type: "textarea",
          placeholder: "Enter product description...",
        },
        {
          label: "Image Attachment",
          type: "file",
          placeholder: "Upload product image",
        },
      ];

      const fieldsWithDefaults: GeneratedFieldsResponse = {
        ...fields,
        fields: [...fields.fields, ...defaultFields],
      };

      setGeneratedFields(fieldsWithDefaults);

      const initialData: Record<
        string,
        string | number | File | null | string[]
      > = {};
      fieldsWithDefaults.fields.forEach((field) => {
        if (field.type === "file") {
          initialData[field.label] = null;
        } else if (field.type === "dropdown") {
          initialData[field.label] = [];
        } else {
          initialData[field.label] = field.type === "number" ? 0 : "";
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error("Error generating fields:", error);
      setError(
        error instanceof Error ? error.message : "Failed to generate fields"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setGeneratedFields(null);
    setFormData({});
    setImageUrl("");
    setError(null);
    setItemInput("");
    setCustomValues({});
    setDropdownSearch({});
    setDropdownOpen({});
    setCustomFields([]);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct(productId);
      loadProducts();
    }
  };

  const handleInputChange = (
    label: string,
    value: string | number | File | null | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleFileChange = (label: string, file: File | null) => {
    setFormData((prev) => ({ ...prev, [label]: file }));
  };

  const handleDropdownSearch = (label: string, searchValue: string) => {
    setDropdownSearch((prev) => ({ ...prev, [label]: searchValue }));
    setDropdownOpen((prev) => ({ ...prev, [label]: true }));
  };

  const handleAddCustomValue = (
    label: string,
    value: string,
    options: string[] = []
  ) => {
    if (!value.trim()) return;
    const trimmed = value.trim();
    const existsInOptions = options.some(
      (opt) => opt.toLowerCase() === trimmed.toLowerCase()
    );
    const existsInCustom = (customValues[label] || []).some(
      (opt) => opt.toLowerCase() === trimmed.toLowerCase()
    );

    if (!existsInOptions && !existsInCustom) {
      setCustomValues((prev) => ({
        ...prev,
        [label]: [...(prev[label] || []), trimmed],
      }));
    }

    setFormData((prev) => ({ ...prev, [label]: trimmed }));
    setDropdownSearch((prev) => ({ ...prev, [label]: "" }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const handleSelectOption = (label: string, value: string) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
    setDropdownSearch((prev) => ({ ...prev, [label]: "" }));
    setDropdownOpen((prev) => ({ ...prev, [label]: false }));
  };

  const openSpecModal = (items: string[], title?: string) => {
    setSpecModalItems(items);
    setSpecModalTitle(title || "Specifications");
    setSpecModalOpen(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;

    const fieldId = `custom_${Date.now()}`;
    const options = newFieldOptions.trim()
      ? newFieldOptions
          .split(",")
          .map((opt) => opt.trim())
          .filter((opt) => opt.length > 0)
      : undefined;

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: "dropdown" as const,
      options,
      value: newFieldOptions.trim() ? [] : [],
    };

    setCustomFields((prev) => [...prev, newField]);
    setFormData((prev) => ({
      ...prev,
      [newField.label]: newField.value,
    }));

    setNewFieldLabel("");
    setNewFieldType("dropdown");
    setNewFieldOptions("");
    setIsAddFieldModalOpen(false);
  };

  const handleDeleteCustomField = (fieldId: string, fieldLabel: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== fieldId));
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
      const token = getAuthToken();
      if (!token) {
        requireAuth();
        setIsSubmitting(false);
        return;
      }

      // Upload files to S3 and replace File objects with S3 URLs
      const processedFormData: Record<string, string | number | string[]> = {};
      for (const [key, value] of Object.entries(formData)) {
        if (
          value !== "" &&
          value !== 0 &&
          value !== null &&
          (Array.isArray(value) ? value.length > 0 : true)
        ) {
          // If value is a File, upload it to S3
          if (value instanceof File) {
            try {
              const uploadResult = await uploadFile(
                token,
                value,
                "buyer-attachments"
              );
              processedFormData[key] = uploadResult.url;
            } catch (uploadError: any) {
              console.error(`Error uploading file ${key}:`, uploadError);
              setError(`Failed to upload ${key}. Please try again.`);
              setIsSubmitting(false);
              return;
            }
          } else {
            processedFormData[key] = value as string | number | string[];
          }
        }
      }

      const specifications = Object.entries(processedFormData).map(
        ([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(", ")}`;
          }
          return `${key}: ${value}`;
        }
      );

      const briefProduct: BriefProduct = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: itemInput.trim(),
        category: generatedFields?.item || "General",
        specifications: specifications,
        addedDate: new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }),
        image_link: imageUrl.trim() || "",
      };

      try {
        saveProduct(briefProduct);
      } catch (saveError: any) {
        if (saveError.message && saveError.message.includes("logged in")) {
          requireAuth();
          return;
        }
        throw saveError;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("productAdded"));
      }

      loadProducts();
      handleClearForm();
      showToast({ type: "success", message: "Product saved successfully!" });
    } catch (error: any) {
      console.error("Error saving product:", error);
      if (error.message && error.message.includes("logged in")) {
        setError(
          "You must be logged in to save products. Please log in and try again."
        );
      } else {
        setError("Failed to save product. Please try again.");
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
    setEnquiryName("");
    setShippingAddress({
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      email: "",
    });
  };

  const handleCloseEnquiryModal = () => {
    setIsEnquiryModalOpen(false);
    setEnquiryName("");
    setShippingAddress({
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      email: "",
    });
  };

  const handleSaveEnquiry = (e: React.FormEvent) => {
    e.preventDefault();

    if (!requireAuth()) {
      return;
    }

    if (!enquiryName.trim()) {
      alert("Please enter an enquiry name");
      return;
    }

    console.log(discoverFilterMeta);

    if (
      !shippingAddress.addressLine1.trim() ||
      !shippingAddress.city.trim() ||
      !shippingAddress.state.trim() ||
      !shippingAddress.zipCode.trim() ||
      !shippingAddress.country.trim()
    ) {
      alert("Please fill in all required shipping address fields.");
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

  return (
    <>
      {/* Chat Container + Discover Filters */}
      <div className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900 h-[calc(100vh-68.8px)] relative">
        {/* Chat Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
                    const convertedSessions: ChatSession[] =
                      backendSessions.map((s) => ({
                        id: s._id,
                        title: s.title,
                        createdAt: new Date(s.createdAt).getTime(),
                        updatedAt: new Date(s.updatedAt).getTime(),
                      }));
                    setSessions(convertedSessions);
                  } catch (error) {
                    console.error(
                      "Error reloading sessions from backend:",
                      error
                    );
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
            onProductsUpdate={handleDiscoverProductsUpdate}
            prefillText={getSelectedFiltersAsString()}
            setIsFilterOpen={setIsFilterOpen}
            setDiscoverFilterMeta={setDiscoverFilterMeta}
            discoverFilterMeta={discoverFilterMeta}
            discoverSelectedFilters={discoverSelectedFilters}
            setDiscoverSelectedFilters={setDiscoverSelectedFilters}
            isFilterOpen={isFilterOpen}
            setIsFilterCollapsed={setIsFilterCollapsed}
          />
        </div>

        {/* Right-side Filter Sidebar (desktop) */}
        <div
          className={`hidden md:block h-full overflow-hidden transition-all duration-300 ease-in-out ${
            isFilterOpen ? (isFilterCollapsed ? "w-12" : "w-64") : "w-0"
          }`}
        >
          <div className={`h-full ${isFilterCollapsed ? 'w-12' : 'w-64'}`}>
            <DiscoverFilters
              key={currentSessionId || 'new-chat'}
              onClose={() => setIsFilterOpen(false)}
              discoverFilterMeta={discoverFilterMeta}
              onSelectionChange={setDiscoverSelectedFilters}
              onToggleCollapse={() => {
                setIsFilterOpen(false);
                setIsFilterCollapsed(false);
              }}
              isCollapsed={isFilterCollapsed}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Specifications Modal */}
      {specModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSpecModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-700 rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {specModalTitle}
              </h3>
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
                  <li
                    key={idx}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
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
            className="bg-white dark:bg-gray-700 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Custom Field
              </h2>
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
                  className="w-full px-3 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
            className="bg-white dark:bg-gray-700 rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                New Enquiry
              </h2>
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
                  className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                      setShippingAddress((prev) => ({
                        ...prev,
                        addressLine1: e.target.value,
                      }))
                    }
                    placeholder="Street address"
                    required
                    className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                        setShippingAddress((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                      placeholder="City"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                        setShippingAddress((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                      placeholder="State"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                        setShippingAddress((prev) => ({
                          ...prev,
                          zipCode: e.target.value,
                        }))
                      }
                      placeholder="ZIP"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                        setShippingAddress((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="Country"
                      required
                      className="w-full px-4 py-2.5 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
    </>
  );
}
