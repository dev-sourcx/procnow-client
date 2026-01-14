'use client';

import { useState } from 'react';
import { Product } from '@/lib/api';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  products: Product[];
}

export default function ProductSection({ products }: ProductSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 8;
  
  // Show all products if showAll is true, otherwise show first INITIAL_DISPLAY_COUNT
  const displayProducts = showAll ? products : products.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreProducts = products.length > INITIAL_DISPLAY_COUNT;

  // Mock pricing data - in real app, this would come from the product data
  // You can extract from dynamic_attributes if price is stored there
  const getProductPricing = (product: Product, index: number) => {
    // Mock data for demonstration - replace with actual price extraction logic
    const mockPrices = [
      { current: 289.0, original: 349.0, discount: 17 },
      { current: 495.0, original: null, discount: null },
      { current: 175.0, original: 225.0, discount: 22 },
    ];

    const mock = mockPrices[index % mockPrices.length];
    
    // Try to extract price from dynamic_attributes if available
    const priceFromAttrs = product.dynamic_attributes?.['Price'];
    if (priceFromAttrs) {
      const price = parseFloat(priceFromAttrs.replace(/[^0-9.]/g, ''));
      if (!isNaN(price)) {
        return { current: price, original: null, discount: null };
      }
    }

    return mock;
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayProducts.map((product, index) => {
            const pricing = getProductPricing(product, index);
            return (
              <ProductCard
                key={`${product.product_url || product.title || product._id || index}-${index}`}
                product={product}
                discount={pricing.discount || undefined}
                originalPrice={pricing.original || undefined}
                currentPrice={pricing.current}
              />
            );
          })}
        </div>
        
        {/* View More / View Less Button */}
        {hasMoreProducts && (
          <div className="flex justify-center mt-6">
            {!showAll ? (
              <button
                onClick={() => setShowAll(true)}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>View More ({products.length - INITIAL_DISPLAY_COUNT} more)</span>
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
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowAll(false)}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                <span>View Less</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

