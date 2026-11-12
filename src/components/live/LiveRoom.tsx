// ✅ NOUVEAU : Contrôles caméra pour le host (en bas à droite)
{isHost && (
  <div className="absolute bottom-40 right-4 z-30 flex flex-col gap-3">
    <button
      onClick={toggleMic}
      className={`w-12 h-12 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition ${
        micOn ? "bg-black/40" : "bg-red-500/80"
      }`}
    >
      {micOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
    </button>
    <button
      onClick={switchCamera}
      className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
    >
      <RotateCcw className="w-6 h-6 text-white" />
    </button>
    <button
      onClick={() => setGiftPanelOpen(true)}
      className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
    >
      <Gift className="w-6 h-6 text-pink-500" />
    </button>
    <button
      onClick={() => {/* Logique pour épingler un produit */}}
      className="w-12 h-12 rounded-full bg-red-500/90 backdrop-blur-md flex items-center justify-center active:scale-90 transition shadow-lg shadow-red-500/20"
    >
      <ShoppingBag className="w-6 h-6 text-white" />
    </button>
    {/* ✅ NOUVEAU : Bouton Terminer le live */}
    <button
      onClick={endLive}
      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 border-2 border-red-400 flex items-center justify-center active:scale-90 transition shadow-lg shadow-red-600/50"
      title="Terminer le live"
    >
      <X className="w-6 h-6 text-white" />
    </button>
  </div>
)}
