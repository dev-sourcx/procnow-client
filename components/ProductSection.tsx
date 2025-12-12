'use client';

import { Product } from '@/lib/api';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  products: Product[];
}

export default function ProductSection({ products }: ProductSectionProps) {
  // Take first 3 products for display
  const displayProducts = products.slice(0, 3);

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

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 py-6 bg-[#343541]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProducts.map((product, index) => {
            const pricing = getProductPricing(product, index);
            return (
              <ProductCard
                key={product._id}
                product={product}
                discount={pricing.discount || undefined}
                originalPrice={pricing.original || undefined}
                currentPrice={pricing.current}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

