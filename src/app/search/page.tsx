<div className="aspect-square bg-neutral-800 flex items-center justify-center relative overflow-hidden">
  {product.image_url ? (
    <img 
      src={product.image_url} 
      alt={product.title} 
      className="w-full h-full object-cover" 
    />
  ) : (
    <ShoppingBag className="w-12 h-12 text-neutral-700" />
  )}
  {product.is_featured && (
    <div className="absolute top-2 right-2 bg-yellow-500 rounded-full p-1">
      <Sparkles className="w-3 h-3 text-black" />
    </div>
  )}
</div>