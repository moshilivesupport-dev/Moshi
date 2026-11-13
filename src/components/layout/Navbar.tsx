{/* 🎯 BOUTON CENTRAL TIKTOK EXACT */}
<button
  onClick={() => setIsCreateOpen(true)}
  className="relative -top-3 flex flex-col items-center focus:outline-none"
>
  <div className="relative w-[48px] h-[32px] flex items-center justify-center">
    {/* Fond gauche Cyan */}
    <div className="absolute left-0 w-[25px] h-full bg-[#25F4EE] rounded-l-[10px]" />
    {/* Fond droit Rouge */}
    <div className="absolute right-0 w-[25px] h-full bg-[#FE2C55] rounded-r-[10px]" />
    {/* Carré central noir avec le + */}
    <div className="relative z-10 w-[36px] h-[26px] bg-black rounded-[6px] flex items-center justify-center">
      <Plus className="w-5 h-5 text-white" strokeWidth={3} />
    </div>
  </div>
</button>