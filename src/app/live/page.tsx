// Dans la carte LiveCard, ajoutez cette logique :

{session.host_role === "vendeur" ? (
  <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-pink-600 px-2 py-1 rounded-md">
    <ShoppingBag className="w-3 h-3 text-white" />
    <span className="text-[10px] font-black tracking-wider text-white">LIVE SHOPPING</span>
  </div>
) : (
  <div className="flex items-center gap-1.5 bg-red-600 px-2 py-1 rounded-md">
    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
    <span className="text-[10px] font-black tracking-wider">LIVE</span>
  </div>
)}
