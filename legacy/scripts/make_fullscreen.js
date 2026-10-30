import fs from "fs";

let c = fs.readFileSync("index.html", "utf8");

// 1. Update body and root
c = c.replace(
  `<body class="bg-stone-950 text-stone-900 antialiased min-h-screen flex flex-col items-center justify-start p-1 sm:p-4 select-none">
  <div id="root" class="w-full flex justify-center"></div>`,
  `<body class="bg-[#F5F4F0] text-stone-900 antialiased min-h-screen min-h-[100dvh] w-full m-0 p-0 select-none flex flex-col">
  <div id="root" class="w-full min-h-screen min-h-[100dvh] flex flex-col"></div>`
);

// 2. Update return wrapper and header
const oldReturnStart = `      return (
        <div className="flex flex-col items-center justify-start w-full max-w-4xl">
          
          {/* ========================================================
              FLOATING ROLE SWITCHER & OFFLINE TOGGLE
             ======================================================== */}
          <header className="w-full flex flex-col items-center gap-2 mb-2 z-50">
            {/* Top Network & Sync Bar */}
            <div className="flex items-center justify-between w-full max-w-md px-3 py-1">`;

const newReturnStart = `      return (
        <div className="w-full min-h-screen min-h-[100dvh] bg-[#F5F4F0] text-stone-900 flex flex-col items-center justify-start select-none">
          
          {/* ========================================================
              INTEGRATED ROLE SWITCHER & STATUS BAR
             ======================================================== */}
          <header className="sticky top-0 w-full z-40 bg-stone-900/95 text-stone-200 backdrop-blur-md border-b border-stone-800 shadow-sm flex flex-col items-center">
            {/* Top Network & Sync Bar */}
            <div className="flex items-center justify-between w-full max-w-2xl px-3 py-1.5 border-b border-stone-800/60 text-xs">`;

c = c.replace(oldReturnStart, newReturnStart);

// 3. Update role switcher container to max-w-2xl
c = c.replace(
  `<div className="w-full max-w-md bg-stone-900/90 backdrop-blur-md border border-stone-700/60 rounded-2xl p-1 shadow-2xl flex items-center justify-between overflow-x-auto no-scrollbar gap-1 text-[11px] font-bold text-stone-400">`,
  `<div className="w-full max-w-2xl px-2 py-1.5 flex items-center justify-between overflow-x-auto no-scrollbar gap-1 text-[11px] font-bold text-stone-400">`
);

// 4. Replace iPhone container & Dynamic Island with Full-screen main container
const oldIPhoneBlockStart = `{/* ========================================================
              IPHONE 16 PRO CONTAINER (393px × 852px)
             ======================================================== */}
          <main className="relative w-[393px] h-[852px] bg-[#FAF8F5] rounded-[48px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border-[6px] border-stone-800 flex flex-col justify-between select-none">
            
            {/* DYNAMIC ISLAND & STATUS BAR */}
            <div className="relative w-full pt-2 pb-1 px-6 flex justify-between items-center z-40 bg-[#FAF8F5]">
              <span className="text-xs font-black text-stone-900 tracking-tight tabular-nums">9:41</span>
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-between px-2 text-[9px] text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <i className="fa-solid fa-certificate text-[9px] text-sky-400"></i>
              </div>
              <div className="flex items-center gap-1 text-xs text-stone-900">
                <i className="fa-solid fa-signal text-[10px]"></i>
                <i className="fa-solid fa-wifi text-[10px]"></i>
                <i className="fa-solid fa-battery-full text-xs"></i>
              </div>
            </div>

            {/* Offline Notification Banner (Mountain Market Connect Non-Functional Spec) */}
            {!isOnline && (
              <div className="bg-amber-500 text-stone-950 px-3 py-1.5 text-[11px] font-bold flex items-center justify-between shadow-xs z-40">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Ngoại tuyến · Dữ liệu đang lưu tạm trên máy</span>
                </div>
                <span className="text-[9px] bg-black/20 px-1.5 py-0.5 rounded">Tự đồng bộ</span>
              </div>
            )}

            {/* ========================================================
                VÙNG NỘI DUNG CUỘN ĐỔI THEO VAI TRÒ
               ======================================================== */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-16 flex flex-col">`;

const newMainBlock = `          {/* OFFLINE NOTIFICATION BANNER */}
          {!isOnline && (
            <div className="w-full bg-amber-500 text-stone-950 px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs sticky top-[74px] z-30">
              <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Ngoại tuyến · Dữ liệu đang lưu tạm trên máy</span>
                </div>
                <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-bold">Tự đồng bộ</span>
              </div>
            </div>
          )}

          {/* ========================================================
              FULL SCREEN MOBILE MAIN CONTAINER (RESPONSIVE ON TABLET/DESKTOP)
             ======================================================== */}
          <main className="w-full max-w-2xl flex-1 flex flex-col bg-[#FAF8F5] relative shadow-xs min-h-[calc(100dvh-74px)]">
            
            {/* VÙNG NỘI DUNG CUỘN ĐỔI THEO VAI TRÒ */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-24 flex flex-col">`;

c = c.replace(oldIPhoneBlockStart, newMainBlock);

// 5. Remove Home indicator
const homeIndicator = `            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-stone-300 rounded-full z-50 pointer-events-none"></div>`;
c = c.replace(homeIndicator, "");

// 6. Update customer bottom navigation bar to full-width responsive
const oldBottomNav = `<nav aria-label="Customer Navigation" className="fixed bottom-0 left-0 right-0 max-w-[393px] mx-auto bg-white border-t border-stone-200 py-1.5 px-1 flex items-center justify-around z-40 rounded-b-[44px] shadow-lg">`;
const newBottomNav = `<nav aria-label="Customer Navigation" className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border-t border-stone-200/90 py-2.5 px-3 flex items-center justify-around z-40 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">`;
c = c.replace(oldBottomNav, newBottomNav);

// 7. Update all modal backdrops to fixed inset-0 centered
c = c.replaceAll(
  `className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end"`,
  `className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end items-center"`
);

// 8. Update modal drawers to w-full max-w-2xl max-h-[90dvh]
c = c.replaceAll(
  `className="bg-white rounded-t-[36px] max-h-[88%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`,
  `className="w-full max-w-2xl bg-white rounded-t-[32px] max-h-[90dvh] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`
);
c = c.replaceAll(
  `className="bg-white rounded-t-[36px] max-h-[92%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`,
  `className="w-full max-w-2xl bg-white rounded-t-[32px] max-h-[90dvh] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`
);
c = c.replaceAll(
  `className="bg-white rounded-t-[36px] max-h-[94%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`,
  `className="w-full max-w-2xl bg-white rounded-t-[32px] max-h-[90dvh] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`
);
c = c.replaceAll(
  `className="bg-white rounded-t-[36px] max-h-[85%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`,
  `className="w-full max-w-2xl bg-white rounded-t-[32px] max-h-[90dvh] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl"`
);

// 9. Update shipper scan modal container
c = c.replace(
  `<div className="absolute inset-0 bg-stone-950 z-50 flex flex-col justify-between p-6 text-white text-center">`,
  `<div className="fixed inset-0 bg-stone-950 z-50 flex flex-col justify-between items-center p-6 text-white text-center">`
);

// 10. Update floating toast
c = c.replace(
  `className="absolute top-14 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-stone-900/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border border-stone-800"`,
  `className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-stone-900/95 backdrop-blur-md text-white text-xs px-4 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border border-stone-800"`
);

fs.writeFileSync("index.html", c);
console.log("Successfully transformed index.html to Mobile Full-Screen!");
