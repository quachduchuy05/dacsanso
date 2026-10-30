import fs from 'fs';

// Script to generate complete, pristine index.html conforming 100% to SRS hợp nhất - App Đặc Sản Số
const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Đặc Sản Số – Nông Sản OCOP Lào Cai Cho Cư Dân Hà Nội (Vinhomes Smart City)</title>
  <meta name="description" content="App Đặc Sản Số bán đặc sản, sản phẩm OCOP có nguồn gốc rõ ràng của HTX Lào Cai (gồm cả Yên Bái cũ) cho cư dân Hà Nội. Thí điểm tại Vinhomes Smart City Tây Mỗ.">
  
  <!-- React 18 UMD & Babel Standalone (No Node Build Server required) -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: '#EE4D2D',
            coopGreen: '#14532D',
            ocopGold: '#D97706',
            skyExpress: '#0284C7'
          }
        }
      }
    };
  </script>

  <!-- FontAwesome 6 -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    @keyframes scanline {
      0% { top: 0%; opacity: 0.8; }
      50% { opacity: 1; }
      100% { top: 100%; opacity: 0.8; }
    }
    .animate-scanline {
      position: absolute;
      animation: scanline 2.2s infinite ease-in-out;
    }
  </style>
</head>
<body class="bg-[#121214] text-stone-900 min-h-screen flex flex-col items-center justify-start p-0 sm:p-4 select-none">

  <div id="root" class="w-full flex justify-center"></div>

  <script type="text/babel">
    const { useState, useMemo, useEffect } = React;

    // ==========================================
    // 1. DANH MỤC THAM SỐ HỆ THỐNG PAR (BR-HT-02, SRS Mục 7)
    // ==========================================
    const SYSTEM_PARAMS = [
      { id: 'PAR-18', code: 'PREORDER_DEPOSIT_RATE', label: 'Tỷ lệ cọc Đặt trước (Preorder)', value: '30%', desc: 'Tỷ lệ khách thanh toán online giữ chỗ mùa vụ' },
      { id: 'PAR-19', code: 'PAYMENT_HOLD_MINUTES', label: 'Thời gian giữ hàng thanh toán online', value: '15 phút', desc: 'Đồng hồ đếm ngược giữ tồn kho và suất đặt' },
      { id: 'PAR-11', code: 'COOP_CONFIRM_DEADLINE', label: 'Hạn HTX xác nhận đơn hàng', value: '24 giờ', desc: 'Quá hạn hệ thống tự hủy và hoàn tiền 100%' },
      { id: 'PAR-02', code: 'LOW_STOCK_THRESHOLD', label: 'Ngưỡng cảnh báo tồn kho thấp', value: '10 hộp', desc: 'Gửi thông báo cho HTX khi tồn khả dụng chạm ngưỡng' },
      { id: 'PAR-08', code: 'PREORDER_CANCEL_DEADLINE', label: 'Hạn hủy đặt trước hoàn cọc 100%', value: 'D - 3 ngày', desc: 'Hủy trước 3 ngày thu hoạch được hoàn 100% cọc' },
      { id: 'PAR-21', code: 'EXPRESS_CUTOFF_TIME', label: 'Giờ chốt đơn hỏa tốc trong ngày', value: '10:30 sáng', desc: 'Đặt trước 10h30 để kịp chuyến xe CT05 buổi sáng' },
      { id: 'PAR-22', code: 'GIFT_MESSAGE_MAX_CHARS', label: 'Độ dài tối đa lời nhắn hộp quà', value: '150 ký tự', desc: 'Chặn số điện thoại và liên kết web (BR-DAT-09)' },
      { id: 'PAR-23', code: 'MAX_COD_AMOUNT', label: 'Hạn mức tối đa thanh toán COD', value: '2.000.000đ', desc: 'Đơn vượt hạn mức bắt buộc thanh toán online' },
      { id: 'PAR-FEE', code: 'SHIPPING_TIERS_HN', label: 'Bậc phí ship giao nội thành Hà Nội', value: '0-5km: 20k · 5-10km: 30k · 10-15km: 40k', desc: 'Áp dụng kho trung chuyển Tây Mỗ' }
    ];

    // ==========================================
    // 2. HỒ SƠ PHÁP LÝ HỢP TÁC XÃ (LÀO CAI & YÊN BÁI CŨ)
    // ==========================================
    const INITIAL_COOPS = [
      {
        id: 'coop-02',
        name: 'HTX Nông Nghiệp & Dịch Vụ Tú Lệ',
        taxCode: '5200987654',
        representative: 'Lù A Sáng (Chủ nhiệm HTX)',
        phone: '0978 123 456',
        address: 'Bản La Pán Tẩn, Xã Tú Lệ, Tỉnh Lào Cai (sáp nhập)',
        status: 'approved',
        ocopCert: 'OCOP 5 Sao (QĐ số 142/QĐ-UBND)',
        bankAccount: '8829 - Agribank CN Mù Cang Chải',
        productCount: 4,
        monthlyRevenue: 38500000
      },
      {
        id: 'coop-01',
        name: 'HTX Nông Nghiệp Hữu Cơ Bắc Hà',
        taxCode: '5300891234',
        representative: 'Vàng A Páo',
        phone: '0982 654 321',
        address: 'Xã Na Hối, Huyện Bắc Hà, Tỉnh Lào Cai',
        status: 'approved',
        ocopCert: 'OCOP 4 Sao (QĐ số 88/QĐ-SNN)',
        bankAccount: '4310 - Agribank CN Bắc Hà',
        productCount: 3,
        monthlyRevenue: 24200000
      },
      {
        id: 'coop-03',
        name: 'HTX Thủy Sản Nước Lạnh Sa Pa',
        taxCode: '5300765432',
        representative: 'Trần Đình Tuấn',
        phone: '0913 888 999',
        address: 'Thác Bạc, Phường Sa Pả, Thị xã Sa Pa',
        status: 'approved',
        ocopCert: 'VietGAP Nước Lạnh (VGAP-TS-2024)',
        bankAccount: '1902 - BIDV CN Sa Pa',
        productCount: 2,
        monthlyRevenue: 41000000
      },
      {
        id: 'coop-04',
        name: 'HTX Chè Cổ Thụ Suối Giàng',
        taxCode: '5200654321',
        representative: 'Sùng A Cở',
        phone: '0966 777 888',
        address: 'Bản Pang Cáng, Xã Suối Giàng, Tỉnh Lào Cai',
        status: 'pending_approval',
        ocopCert: 'Hồ sơ OCOP 5 Sao đang thẩm định',
        bankAccount: '5601 - Agribank Văn Chấn',
        productCount: 2,
        monthlyRevenue: 0
      }
    ];

    // ==========================================
    // 3. DANH MỤC SẢN PHẨM ĐẶC SẢN OCOP (LÀO CAI / YÊN BÁI)
    // ==========================================
    const INITIAL_PRODUCTS = [
      {
        id: 'sp-01',
        categoryType: 'seasonal_preorder',
        categoryLabel: 'Mùa vụ (Pre-order)',
        name: 'Cốm Non Tú Lệ Đầu Mùa Thơm Dẻo (Mẻ Thu Hoạch Sớm 05:00 Sáng)',
        coopId: 'coop-02',
        coopName: 'HTX Nông Nghiệp & Dịch Vụ Tú Lệ',
        price: 140000,
        originalPrice: 175000,
        discountPercent: 20,
        soldCount: '3.4k',
        unit: 'hộp 500g',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        isMall: true,
        isPreorder: true,
        depositPercent: 30,
        preorderHarvestDate: '26/10/2026',
        preorderSlots: 85,
        stockTotal: 150,
        stockReserved: 65,
        stockAvailable: 85,
        lowStockThreshold: 10,
        certType: 'OCOP 5 Sao',
        certNumber: 'OCOP-YB-2023-018',
        originDistrict: 'Tú Lệ',
        farmerName: 'Lù A Sáng (Bản La Pán Tẩn)',
        farmerGps: '21.85°N, 104.08°E',
        description: 'Hạt nếp tan Tú Lệ ngậm sương thung lũng Mường Lò, giã tay truyền thống lúc 5h sáng, gói 2 lớp lá dong & lá sen giữ ẩm, giao xe lạnh CT05 về Hà Nội trong ngày.',
        rating: 4.95,
        reviewsCount: 428,
        batchCode: 'LOT-YB-TL-260923',
        shelfLife: '3 ngày',
        harvestTimeline: [
          { time: '05:00', step: 'Nông hộ gặt lúa nếp tan ngậm sương' },
          { time: '07:30', step: 'Rang củi & giã tay cối đá truyền thống' },
          { time: '09:30', step: 'Đóng gói lá sen, hút chân không, ướp đá gel' },
          { time: '11:00', step: 'Xe chuyên tuyến CT05 xuất bến về Hà Nội' }
        ]
      },
      {
        id: 'sp-02',
        categoryType: 'seasonal_preorder',
        categoryLabel: 'Mùa vụ (Pre-order)',
        name: 'Mận Tam Hoa Bắc Hà Mọng Nước Phủ Phấn Trắng Tươi Rói (Hái Đầu Cành)',
        coopId: 'coop-01',
        coopName: 'HTX Nông Nghiệp Hữu Cơ Bắc Hà',
        price: 85000,
        originalPrice: 110000,
        discountPercent: 22,
        soldCount: '2.8k',
        unit: 'hộp 1kg',
        image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=600&q=80',
        isMall: true,
        isPreorder: true,
        depositPercent: 30,
        preorderHarvestDate: '28/10/2026',
        preorderSlots: 120,
        stockTotal: 200,
        stockReserved: 80,
        stockAvailable: 120,
        lowStockThreshold: 15,
        certType: 'OCOP 4 Sao',
        certNumber: 'OCOP-LC-2023-112',
        originDistrict: 'Bắc Hà',
        farmerName: 'Vàng A Páo (Cao nguyên trắng)',
        farmerGps: '22.54°N, 104.28°E',
        description: 'Mận Tam Hoa trồng ở độ cao trên 1.000m, quả to giòn rụm vị chua ngọt thanh mát, hái sáng sớm tại vườn còn nguyên lớp phấn trắng.',
        rating: 4.88,
        reviewsCount: 310,
        batchCode: 'LOT-LC-BH-260925',
        shelfLife: '5 ngày'
      },
      {
        id: 'sp-03',
        categoryType: 'dried',
        categoryLabel: 'Sản phẩm khô',
        name: 'Thịt Trâu Gác Bếp Sa Pa Chuẩn Vị Hun Khói Mắc Khén Hạt Dổi (Gói 500g)',
        coopId: 'coop-03',
        coopName: 'HTX Thủy Sản & Nông Sản Sa Pa',
        price: 450000,
        originalPrice: 520000,
        discountPercent: 13,
        soldCount: '5.1k',
        unit: 'gói 500g',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        isMall: true,
        isPreorder: false,
        depositPercent: 0,
        stockTotal: 90,
        stockReserved: 12,
        stockAvailable: 78,
        lowStockThreshold: 10,
        certType: 'OCOP 4 Sao',
        certNumber: 'OCOP-LC-2023-045',
        originDistrict: 'Sa Pa',
        farmerName: 'Giàng Thị Mỷ (Tả Phìn)',
        farmerGps: '22.36°N, 103.85°E',
        description: 'Bắp trâu tươi chọn lọc ướp hạt dổi, mắc khén rừng Hoàng Liên Sơn, hun khói củi nhãn đỏ tự nhiên 48 giờ thơm lừng thớ thịt đỏ au.',
        rating: 4.96,
        reviewsCount: 890,
        batchCode: 'LOT-MC-260923',
        shelfLife: '6 tháng'
      },
      {
        id: 'sp-04',
        categoryType: 'fresh',
        categoryLabel: 'Sản phẩm tươi 2H',
        name: 'Cá Hồi Vân Sa Pa Tươi Sống Nguyên Con (Mổ Làm Sạch Ướp Đá Gel Tuyến CT05)',
        coopId: 'coop-03',
        coopName: 'HTX Thủy Sản Nước Lạnh Sa Pa',
        price: 340000,
        originalPrice: 420000,
        discountPercent: 19,
        soldCount: '850',
        unit: 'kg',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
        isMall: true,
        isPreorder: false,
        depositPercent: 0,
        stockTotal: 40,
        stockReserved: 8,
        stockAvailable: 32,
        lowStockThreshold: 5,
        certType: 'VietGAP Nước Lạnh',
        certNumber: 'VGAP-TS-2024-004',
        originDistrict: 'Sa Pa',
        farmerName: 'Trần Đình Tuấn (Thác Bạc)',
        farmerGps: '22.35°N, 103.78°E',
        description: 'Cá hồi vân nuôi tại dòng suối lạnh Thác Bạc Fansipan nhiệt độ dưới 12°C. Thịt cam hồng săn chắc, phi lê ăn sashimi hoặc nướng bơ tỏi.',
        rating: 4.9,
        reviewsCount: 175,
        batchCode: 'LOT-SP-CH-2026',
        shelfLife: '2 ngày'
      },
      {
        id: 'sp-05',
        categoryType: 'dried',
        categoryLabel: 'Sản phẩm khô',
        name: 'Trà Shan Tuyết Cổ Thụ Suối Giàng 300 Năm Tuổi Búp Trắng (Hộp 100g)',
        coopId: 'coop-04',
        coopName: 'HTX Chè Cổ Thụ Suối Giàng',
        price: 350000,
        originalPrice: 420000,
        discountPercent: 16,
        soldCount: '1.2k',
        unit: 'hộp 100g',
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        isMall: true,
        isPreorder: false,
        depositPercent: 0,
        stockTotal: 60,
        stockReserved: 5,
        stockAvailable: 55,
        lowStockThreshold: 10,
        certType: 'OCOP 5 Sao',
        certNumber: 'OCOP-SG-2023-005',
        originDistrict: 'Suối Giàng',
        farmerName: 'Sùng A Cở (Pang Cáng)',
        farmerGps: '21.62°N, 104.55°E',
        description: 'Búp chè ngậm sương tuyết trên đỉnh núi cao 1.400m, cây cổ thụ 300-500 năm tuổi, vị thanh ngọt hậu sâu lưu hương bền bỉ.',
        rating: 5.0,
        reviewsCount: 310,
        batchCode: 'LOT-SG-ST-2026',
        shelfLife: '24 tháng'
      }
    ];

    // ==========================================
    // 4. SỔ ĐỊA CHỈ HÀ NỘI & VINHOMES SMART CITY (FR-TK-04, BR-DAT-04)
    // ==========================================
    const INITIAL_ADDRESSES = [
      {
        id: 'addr-01',
        title: 'Chung cư Vinhomes Smart City (Tây Mỗ)',
        receiverName: 'Nguyễn Văn An',
        receiverPhone: '0988 234 567',
        houseType: 'apartment',
        subdivision: 'Sapphire 2',
        buildingBlock: 'Tòa S2.03, Căn 1508',
        district: 'Nam Từ Liêm',
        ward: 'Tây Mỗ',
        city: 'Hà Nội',
        isDefault: true,
        note: 'Giao sảnh lễ tân hoặc gọi trước 10 phút'
      },
      {
        id: 'addr-02',
        title: 'Chung cư Vinhomes Smart City (Masteri)',
        receiverName: 'Nguyễn Văn An',
        receiverPhone: '0988 234 567',
        houseType: 'apartment',
        subdivision: 'Masteri West Heights',
        buildingBlock: 'Tòa West A, Căn 2104',
        district: 'Nam Từ Liêm',
        ward: 'Tây Mỗ',
        city: 'Hà Nội',
        isDefault: false,
        note: 'Giao cửa hầm B1'
      },
      {
        id: 'addr-03',
        title: 'Nhà riêng Duy Tân Cầu Giấy',
        receiverName: 'Nguyễn Văn An',
        receiverPhone: '0988 234 567',
        houseType: 'ground',
        streetDetails: 'Số 18, Ngõ 72, Phố Duy Tân',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng Hậu',
        city: 'Hà Nội',
        isDefault: false
      }
    ];

    // ==========================================
    // 5. DANH SÁCH 11 TRẠNG THÁI ĐƠN HÀNG CHUẨN (BR-VD-01, OI-05)
    // ==========================================
    const ORDER_STATUS_LABELS = {
      cho_thanh_toan: { label: 'Chờ thanh toán', badge: 'bg-amber-100 text-amber-900 border-amber-300', icon: 'fa-clock' },
      cho_xac_nhan: { label: 'Chờ xác nhận', badge: 'bg-blue-100 text-blue-900 border-blue-300', icon: 'fa-store' },
      da_xac_nhan: { label: 'Đã xác nhận', badge: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: 'fa-circle-check' },
      cho_thu_hoach: { label: 'Chờ thu hoạch (Pre-order)', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: 'fa-wheat-awn' },
      dang_chuan_bi: { label: 'Đang chuẩn bị hàng', badge: 'bg-amber-100 text-amber-900 border-amber-300', icon: 'fa-box' },
      dang_giao: { label: 'Đang giao hàng (Xe CT05)', badge: 'bg-sky-100 text-sky-900 border-sky-300', icon: 'fa-truck-fast' },
      da_giao: { label: 'Đã giao thành công', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: 'fa-house-circle-check' },
      tra_hang_hoan_tien: { label: 'Trả hàng – Hoàn tiền', badge: 'bg-rose-100 text-rose-900 border-rose-300', icon: 'fa-rotate-left' },
      dang_chuyen_hoan: { label: 'Đang chuyển hoàn', badge: 'bg-orange-100 text-orange-900 border-orange-300', icon: 'fa-arrow-rotate-back' },
      da_hoan_ve: { label: 'Đã hoàn về HTX', badge: 'bg-stone-200 text-stone-800 border-stone-300', icon: 'fa-boxes-packing' },
      da_huy: { label: 'Đã huỷ đơn', badge: 'bg-stone-100 text-stone-500 border-stone-200', icon: 'fa-ban' }
    };

    // ==========================================
    // 6. ĐƠN HÀNG MẪU THEO DÕI ĐA TRẠNG THÁI (BR-VD-01, BR-VD-02)
    // ==========================================
    const INITIAL_ORDERS = [
      {
        id: 'ORD-2609-8892',
        createdAt: 'Hôm nay, 08:30',
        items: [
          { product: INITIAL_PRODUCTS[0], quantity: 2 } // Cốm Tú Lệ
        ],
        coopId: 'coop-02',
        coopName: 'HTX Nông Nghiệp & Dịch Vụ Tú Lệ',
        address: INITIAL_ADDRESSES[0],
        subtotal: 280000,
        shippingFee: 45000,
        voucherDiscount: 20000,
        depositPaid: 84000, // Cọc 30% Online
        remainingCod: 221000, // 70% COD khi nhận
        status: 'dang_giao', // 1 trong 11 trạng thái chuẩn
        paymentStatus: 'Đã cọc 30% – còn 70%', // Cột tình trạng thanh toán độc lập (BR-VD-02)
        expectedDelivery: 'Hôm nay, 17:15 – 17:45 (Tòa S2.03 Tây Mỗ)',
        isPreorder: true,
        assignedShipper: 'Nguyễn Văn Thắng (Hub Tây Mỗ - Tuyến CT05)',
        currentTemp: '11.5°C (Đá gel an toàn)',
        driverPhone: '0912 345 678',
        giftMessage: 'Biếu gia đình mẻ Cốm Tú Lệ đầu mùa thơm ngon!',
        isGiftForOther: false
      },
      {
        id: 'ORD-2609-7714',
        createdAt: 'Hôm qua, 14:20',
        items: [
          { product: INITIAL_PRODUCTS[2], quantity: 1 } // Thịt trâu Sa Pa
        ],
        coopId: 'coop-03',
        coopName: 'HTX Thủy Sản & Nông Sản Sa Pa',
        address: INITIAL_ADDRESSES[0],
        subtotal: 450000,
        shippingFee: 28000,
        voucherDiscount: 50000,
        depositPaid: 428000,
        remainingCod: 0,
        status: 'da_giao',
        paymentStatus: 'Đã thanh toán',
        expectedDelivery: 'Đã nhận lúc 16:30 hôm qua',
        isPreorder: false,
        assignedShipper: 'Trần Văn Mạnh (Shipper Tây Mỗ)',
        currentTemp: 'Thường (Hút chân không)',
        driverPhone: '0987 654 321',
        isReviewed: false
      },
      {
        id: 'ORD-2609-9021',
        createdAt: 'Hôm nay, 09:10',
        items: [
          { product: INITIAL_PRODUCTS[1], quantity: 2 } // Mận Tam Hoa
        ],
        coopId: 'coop-01',
        coopName: 'HTX Nông Nghiệp Hữu Cơ Bắc Hà',
        address: INITIAL_ADDRESSES[0],
        subtotal: 170000,
        shippingFee: 45000,
        voucherDiscount: 15000,
        depositPaid: 51000, // Cọc 30%
        remainingCod: 149000,
        status: 'cho_thu_hoach',
        paymentStatus: 'Đã cọc 30% – còn 70%',
        expectedDelivery: 'Ngày giao dự kiến: 28/10/2026',
        isPreorder: true
      },
      {
        id: 'ORD-2609-6618',
        createdAt: 'Hôm nay, 10:45',
        items: [
          { product: INITIAL_PRODUCTS[4], quantity: 1 } // Chè Shan Tuyết
        ],
        coopId: 'coop-04',
        coopName: 'HTX Chè Cổ Thụ Suối Giàng',
        address: INITIAL_ADDRESSES[1],
        subtotal: 350000,
        shippingFee: 28000,
        voucherDiscount: 35000,
        depositPaid: 0,
        remainingCod: 343000,
        status: 'cho_xac_nhan',
        paymentStatus: 'Chưa thanh toán COD',
        expectedDelivery: 'Chờ HTX Suối Giàng duyệt trong 24h',
        isPreorder: false
      },
      {
        id: 'ORD-2609-5502',
        createdAt: '22/10/2026, 09:00',
        items: [
          { product: INITIAL_PRODUCTS[3], quantity: 1 } // Cá Hồi Sa Pa
        ],
        coopId: 'coop-03',
        coopName: 'HTX Thủy Sản Nước Lạnh Sa Pa',
        address: INITIAL_ADDRESSES[0],
        subtotal: 340000,
        shippingFee: 45000,
        voucherDiscount: 0,
        depositPaid: 385000,
        remainingCod: 0,
        status: 'tra_hang_hoan_tien',
        paymentStatus: 'Đang hoàn tiền',
        expectedDelivery: 'Sự cố đứt gãy chuỗi lạnh (>15°C)',
        isPreorder: false
      }
    ];

    // ==========================================
    // 7. // KHO MÃ GIẢM GIÁ ĐA DẠNG (HỖ TRỢ CHỌN NHIỀU MÃ CÙNG LÚC - MULTI-VOUCHER STACKING)
    // ==========================================
    const AVAILABLE_VOUCHERS = [
      // 1. Nhóm Vận Chuyển Chuỗi Lạnh (Freeship & Trợ giá)
      {
        id: 'VC_FREESHIP25',
        code: 'FREESHIP25K',
        category: 'shipping',
        categoryLabel: 'Vận chuyển',
        title: 'Giảm 25.000đ Phí Ship Tuyến Hỏa Tốc CT05',
        sub: 'Áp dụng cho mọi đơn nông sản chuỗi lạnh từ 100.000đ',
        discountAmount: 25000,
        minSpend: 100000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Freeship CT05',
        colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      {
        id: 'VC_FREESHIP_MAX',
        code: 'FREESHIP100',
        category: 'shipping',
        categoryLabel: 'Vận chuyển',
        title: 'Miễn Phí Vận Chuyển Toàn Bộ (Tối đa 45.000đ)',
        sub: 'Áp dụng đơn hàng đặc sản từ 300.000đ giao toàn Hà Nội',
        discountAmount: 45000,
        minSpend: 300000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Freeship 100%',
        colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      {
        id: 'VC_SHIP_XANH',
        code: 'SHIP_XANH15K',
        category: 'shipping',
        categoryLabel: 'Vận chuyển',
        title: 'Trợ Giá Xe Lạnh Tuyến Tỉnh 15.000đ',
        sub: 'Hỗ trợ xe buýt lạnh tuyến Lào Cai - Hà Nội, đơn từ 80.000đ',
        discountAmount: 15000,
        minSpend: 80000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Xe Lạnh Xanh',
        colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },
      {
        id: 'VC_FREESHIP_NGOAITHANH',
        code: 'NGOAI_THANH30K',
        category: 'shipping',
        categoryLabel: 'Vận chuyển',
        title: 'Hỗ Trợ Giao Ngoại Thành Hà Nội 30.000đ',
        sub: 'Áp dụng quận Hà Đông, Long Biên, Gia Lâm, Đông Anh từ 250.000đ',
        discountAmount: 30000,
        minSpend: 250000,
        expiry: 'HSD: 30/10/2026',
        badge: 'Ngoại Thành HN',
        colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      },

      // 2. Nhóm Giảm Giá Nông Sản OCOP & Gian Hàng Chính Hãng
      {
        id: 'VC_OCOP20',
        code: 'OCOP20K',
        category: 'ocop',
        categoryLabel: 'Nông sản OCOP',
        title: 'Giảm 20.000đ Đơn Hàng Nông Sản Bảo Chứng OCOP',
        sub: 'Áp dụng cho các sản phẩm đạt chuẩn OCOP 4-5 sao và VietGAP',
        discountAmount: 20000,
        minSpend: 100000,
        expiry: 'HSD: 30/10/2026',
        badge: 'CQQLNN Tài Trợ',
        colorBadge: 'bg-orange-100 text-orange-900 border-orange-300'
      },
      {
        id: 'VC_TAYBAC50',
        code: 'TAYBAC50K',
        category: 'ocop',
        categoryLabel: 'Đặc sản Tây Bắc',
        title: 'Giảm 50.000đ Đơn Hàng Từ 350.000đ',
        sub: 'Áp dụng khi mua Cốm Tú Lệ, Thịt trâu gác bếp hoặc Cá hồi Sa Pa',
        discountAmount: 50000,
        minSpend: 350000,
        expiry: 'HSD: 28/10/2026',
        badge: 'Tinh Hoa Tây Bắc',
        colorBadge: 'bg-orange-100 text-orange-900 border-orange-300'
      },
      {
        id: 'VC_OCOP_VIP80',
        code: 'OCOP_VIP80K',
        category: 'ocop',
        categoryLabel: 'Đặc sản Tây Bắc',
        title: 'Giảm 80.000đ Bộ Nông Sản OCOP 5 Sao Cao Cấp',
        sub: 'Áp dụng cho các giỏ hàng nông sản bảo chứng giá trị từ 500.000đ',
        discountAmount: 80000,
        minSpend: 500000,
        expiry: 'HSD: 31/10/2026',
        badge: 'OCOP 5 Sao',
        colorBadge: 'bg-orange-100 text-orange-900 border-orange-300'
      },
      {
        id: 'VC_VIETGAP25',
        code: 'VIETGAP25K',
        category: 'ocop',
        categoryLabel: 'Nông sản OCOP',
        title: 'Giảm 25.000đ Trực Tiếp Hàng Tươi VietGAP',
        sub: 'Áp dụng các mặt hàng mận, nếp, gạo lúa nương tươi từ 180.000đ',
        discountAmount: 25000,
        minSpend: 180000,
        expiry: 'HSD: 31/10/2026',
        badge: 'VietGAP Chuẩn',
        colorBadge: 'bg-orange-100 text-orange-900 border-orange-300'
      },

      // 3. Nhóm Mùa Vụ Pre-order & Khuyến Nông Bản Làng
      {
        id: 'VC_PREORDER15',
        code: 'VU_MUA_15K',
        category: 'seasonal',
        categoryLabel: 'Mùa vụ Pre-order',
        title: 'Giảm 15.000đ Giữ Chỗ Mùa Vụ (Pre-order)',
        sub: 'Ưu đãi giữ chỗ sớm mẻ thu hoạch Cốm Tú Lệ và Mận Tam Hoa',
        discountAmount: 15000,
        minSpend: 80000,
        expiry: 'HSD: 25/10/2026',
        badge: 'Ưu Đãi Vụ Mùa',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_COM_TULE',
        code: 'COM_TULE_20K',
        category: 'seasonal',
        categoryLabel: 'Mùa vụ Pre-order',
        title: 'Giảm 20.000đ Cốm Non Tú Lệ Mẻ Mới',
        sub: 'Đặc quyền mẻ thu hoạch đầu vụ xã Tú Lệ, áp dụng từ 120.000đ',
        discountAmount: 20000,
        minSpend: 120000,
        expiry: 'HSD: 30/10/2026',
        badge: 'Mẻ Cốm Mới',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_MAN_TAMHOA',
        code: 'MAN_BAC_HA15K',
        category: 'seasonal',
        categoryLabel: 'Mùa vụ Pre-order',
        title: 'Giảm 15.000đ Mận Tam Hoa Bắc Hà',
        sub: 'Áp dụng khi đặt mận tươi Bắc Hà thu hoạch sáng sớm từ 100.000đ',
        discountAmount: 15000,
        minSpend: 100000,
        expiry: 'HSD: 29/10/2026',
        badge: 'Mận Bắc Hà',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_SHAN_TUYET',
        code: 'TRA_CO_THU35K',
        category: 'seasonal',
        categoryLabel: 'Mùa vụ Pre-order',
        title: 'Giảm 35.000đ Chè Shan Tuyết Cổ Thụ Suối Giàng',
        sub: 'Áp dụng các dòng chè tuyết cổ thụ 300 năm tuổi từ 250.000đ',
        discountAmount: 35000,
        minSpend: 250000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Trà Suối Giàng',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_BANLAN30',
        code: 'UNG_HO_BAN_30K',
        category: 'seasonal',
        categoryLabel: 'Khuyến nông bản làng',
        title: 'Giảm 30.000đ Quỹ Khuyến Nông Bản La Pán Tẩn',
        sub: 'Quỹ xúc tiến thương mại tỉnh hỗ trợ trực tiếp người tiêu dùng Thủ đô',
        discountAmount: 30000,
        minSpend: 250000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Quỹ Bản Làng',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_HTX_SO',
        code: 'LIEN_MINH_HTX25K',
        category: 'seasonal',
        categoryLabel: 'Khuyến nông bản làng',
        title: 'Giảm 25.000đ Trợ Giá Liên Minh HTX Nông Nghiệp Số',
        sub: 'Chương trình phát triển kinh tế số HTX vùng cao, đơn từ 200.000đ',
        discountAmount: 25000,
        minSpend: 200000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Liên Minh HTX',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },
      {
        id: 'VC_DON_DAUTIEN',
        code: 'KHACH_MOI_30K',
        category: 'seasonal',
        categoryLabel: 'Khuyến nông bản làng',
        title: 'Giảm 30.000đ Đơn Hàng Đầu Tiên Trải Nghiệm Đặc Sản',
        sub: 'Chào mừng khách hàng Thủ đô lần đầu đặt nông sản Tây Bắc từ 90.000đ',
        discountAmount: 30000,
        minSpend: 90000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Khách Hàng Mới',
        colorBadge: 'bg-amber-100 text-amber-900 border-amber-300'
      },

      // 4. Nhóm Hộp Quà Cao Cấp & Combo Quà Biếu
      {
        id: 'VC_COMBO_GIFT40',
        code: 'HOP_QUA_40K',
        category: 'gift',
        categoryLabel: 'Hộp quà cao cấp',
        title: 'Giảm 40.000đ Khi Đặt Bộ Hộp Quà Giấy Craft',
        sub: 'Áp dụng cho Hộp Quà Bản Giã hoặc Hộp Quà Sưởi Ấm Vùng Cao',
        discountAmount: 40000,
        minSpend: 400000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Quà Tặng OCOP',
        colorBadge: 'bg-rose-100 text-rose-900 border-rose-300'
      },
      {
        id: 'VC_GIO_QUA_TET70',
        code: 'GIO_QUA_OCOP70K',
        category: 'gift',
        categoryLabel: 'Hộp quà cao cấp',
        title: 'Giảm 70.000đ Giỏ Quà Biếu Tinh Hoa Vùng Cao',
        sub: 'Áp dụng cho bộ quà tặng kết hợp Cốm Tú Lệ + Thịt Gác Bếp + Trà Shan Tuyết',
        discountAmount: 70000,
        minSpend: 600000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Giỏ Quà Biếu',
        colorBadge: 'bg-rose-100 text-rose-900 border-rose-300'
      },
      {
        id: 'VC_DOANH_NGHIEP100',
        code: 'DOANH_NGHIEP100K',
        category: 'gift',
        categoryLabel: 'Hộp quà cao cấp',
        title: 'Giảm 100.000đ Đơn Quà Tặng Doanh Nghiệp',
        sub: 'Áp dụng đơn hàng quà tặng số lượng lớn cho công ty từ 800.000đ',
        discountAmount: 100000,
        minSpend: 800000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Doanh Nghiệp',
        colorBadge: 'bg-rose-100 text-rose-900 border-rose-300'
      },

      // 5. Nhóm Thanh Toán Số & Ngân Hàng Đối Tác (Fintech)
      {
        id: 'VC_VIETQR10',
        code: 'VIETQR10K',
        category: 'fintech',
        categoryLabel: 'Thanh toán số',
        title: 'Giảm 10.000đ Quét Mã VietQR Dynamic Tức Thì',
        sub: 'Áp dụng khi thanh toán chuyển khoản quét QR ngân hàng từ 100.000đ',
        discountAmount: 10000,
        minSpend: 100000,
        expiry: 'HSD: 31/10/2026',
        badge: 'VietQR Ưu Đãi',
        colorBadge: 'bg-sky-100 text-sky-900 border-sky-300'
      },
      {
        id: 'VC_VNPAY20',
        code: 'VNPAY_MOMO20K',
        category: 'fintech',
        categoryLabel: 'Thanh toán số',
        title: 'Giảm 20.000đ Thanh Toán Qua Ví MoMo / VNPay',
        sub: 'Áp dụng liên kết ví điện tử thanh toán an toàn từ 200.000đ',
        discountAmount: 20000,
        minSpend: 200000,
        expiry: 'HSD: 31/10/2026',
        badge: 'Ví Điện Tử',
        colorBadge: 'bg-sky-100 text-sky-900 border-sky-300'
      }
    ];

    // ==========================================
    // 8. BỘ HỘP QUÀ TẶNG DOANH NGHIỆP & GIA ĐÌNH (FR-MHTT-04, BR-DAT-09)
    // ==========================================
    const GIFT_SETS = [
      {
        id: 'GIFT-01',
        name: 'Hộp Quà Bản Giã - Tinh Hoa Mùa Cốm Tú Lệ',
        price: 360000,
        sub: 'Gồm 2 hộp Cốm Tú Lệ 500g + 1 hũ Mật ong bạc hà 250ml + Thiệp viết tay giấy rơm',
        packaging: 'Hộp giấy Craft mộc Eco-friendly, thắt nơ dây đay tự nhiên',
        image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
        badge: 'Bán chạy nhất'
      },
      {
        id: 'GIFT-02',
        name: 'Hộp Quà Sưởi Ấm Vùng Cao - Đặc Sản Cao Nguyên',
        price: 680000,
        sub: 'Gồm 1 gói Thịt trâu gác bếp 500g + 1 hộp Trà Shan Tuyết Suối Giàng 100g + Rượu ngô men lá',
        packaging: 'Hộp gỗ thông khắc laser hoa văn thổ cẩm Mông',
        image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
        badge: 'Cao cấp OCOP 5 Sao'
      }
    ];

    // ==========================================
    // 9. DANH SÁCH TICKET KHIẾU NẠI & CSKH (FR-CSKH-01..09, BR-TCH-01..05)
    // ==========================================
    const INITIAL_TICKETS = [
      {
        id: 'TCK-2609-01',
        orderId: 'ORD-2609-5502',
        customerName: 'Nguyễn Văn An',
        customerPhone: '0988 234 567',
        coopId: 'coop-03',
        coopName: 'HTX Thủy Sản Nước Lạnh Sa Pa',
        issueType: 'broken_cold_chain',
        issueLabel: 'Đứt gãy chuỗi lạnh đá gel (Nhiệt độ >15°C)',
        priority: 'urgent', // Tự động gắn Khẩn cấp (BR-TCH-04)
        status: 'investigating', // Đang phân định lỗi
        customerNote: 'Cá hồi nhận tại Vinhomes Smart City bị tan đá hoàn toàn, túi giữ nhiệt rách, cá có mùi lạ.',
        coopResponse: 'HTX đã đóng 2 tảng đá gel -18°C lúc 07:00, đề nghị kiểm tra chành xe CT05 làm chậm chuyến.',
        adminVerdict: 'Lỗi vận chuyển tuyến tỉnh làm chậm 4 giờ. Quyết định: Hoàn tiền 100% (385.000đ) cho khách.',
        refundAmount: 385000,
        customerBank: 'Vietcombank - 1023847599 (NGUYEN VAN AN)',
        createdAt: 'Hôm nay, 10:15'
      },
      {
        id: 'TCK-2609-02',
        orderId: 'ORD-2609-8892',
        customerName: 'Lê Thị Mai',
        customerPhone: '0912 345 678',
        coopId: 'coop-02',
        coopName: 'HTX Nông Nghiệp & Dịch Vụ Tú Lệ',
        issueType: 'delivery_time',
        issueLabel: 'Hẹn lại khung giờ giao nhận',
        priority: 'normal',
        status: 'resolved',
        customerNote: 'Nhờ shipper giao sau 18h00 khi tôi đi làm về tại Tòa S2.03.',
        coopResponse: 'Đã báo shipper nội khu Tây Mỗ hỗ trợ giao ca chiều tối 18:15.',
        adminVerdict: 'Đã cập nhật ghi chú đơn hàng cho shipper.',
        refundAmount: 0,
        createdAt: 'Hôm qua, 16:30'
      }
    ];

    // ==========================================
    // 10. NHẬT KÝ THAO TÁC KIỂM TOÁN (AUDIT LOG - BR-QL-05, FR-HT-03)
    // ==========================================
    const INITIAL_AUDIT_LOGS = [
      { id: 'LOG-1001', time: '14/10/2026 09:15', actor: 'Admin Vận hành (Trần Minh Tuấn)', action: 'Cập nhật tham số PAR-18', detail: 'Tỷ lệ cọc Preorder từ 25% -> 30% theo biên bản họp 08/10', ip: '118.70.12.44' },
      { id: 'LOG-1002', time: '14/10/2026 09:40', actor: 'Admin Chất lượng (Lê Thanh Hà)', action: 'Phê duyệt hồ sơ HTX', detail: 'Duyệt hồ sơ HTX Tú Lệ (MST 5200987654) đạt chuẩn OCOP 5 sao', ip: '118.70.12.89' },
      { id: 'LOG-1003', time: '14/10/2026 10:20', actor: 'Admin CSKH (Nguyễn Thu Hương)', action: 'Xử lý Ticket TCK-2609-01', detail: 'Kết luận lỗi chuỗi lạnh xe khách, duyệt hoàn tiền 100% (385.000đ) cho khách', ip: '118.70.13.12' },
      { id: 'LOG-1004', time: '14/10/2026 11:05', actor: 'Admin Tài chính (Đỗ Quang Dũng)', action: 'Chốt đối soát Kỳ 2 (T+3)', detail: 'Chốt bảng kê quyết toán 4 khoản và tạo lệnh chi trả 8.450.000đ qua Agribank', ip: '118.70.13.65' }
    ];

    const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

    function App() {
      // 6 VAI TRÒ CHÍNH (SRS Mục 2 & Mục 11):
      // 'customer' (Khách cư dân) | 'coop' (HTX) | 'shipper' (Giao vận) | 'ops' (Điều phối CT05) | 'regulator' (Cơ quan QLNN) | 'admin' (Admin hệ thống)
      const [currentRole, setCurrentRole] = useState('customer');

      // Phân hệ Admin Tab:
      // 'operations' (Vận hành & PAR) | 'quality' (Duyệt HTX & SP) | 'cskh' (Xử lý Ticket & Đánh giá) | 'finance' (Đối soát 4 khoản & Hoàn tiền) | 'audit' (Nhật ký thao tác)
      const [adminTab, setAdminTab] = useState('operations');

      // Phân hệ HTX Tab:
      // 'orders' (Đơn hàng 11 trạng thái) | 'inventory' (Tồn khả dụng) | 'harvest' (Báo thu hoạch) | 'reconciliation' (Ví & Đối soát 4 khoản) | 'tickets' (Phản hồi khiếu nại)
      const [coopTab, setCoopTab] = useState('orders');

      // 5 TABS CỦA KHÁCH HÀNG:
      // 'home' (Khám phá) | 'season' (Vụ mùa Pre-order) | 'trace' (Quét QR Lô EPCIS) | 'gifts' (Hộp quà) | 'profile' (Tài khoản & Đơn mua)
      const [customerTab, setCustomerTab] = useState('home');

      // Bộ lọc danh mục & địa phương
      const [originFilter, setOriginFilter] = useState('Tất cả');
      const [categoryFilter, setCategoryFilter] = useState('all');
      const [orderStatusFilter, setOrderStatusFilter] = useState('all');

      // Dữ liệu ứng dụng
      const [products, setProducts] = useState(INITIAL_PRODUCTS);
      const [coops, setCoops] = useState(INITIAL_COOPS);
      const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
      const [selectedAddress, setSelectedAddress] = useState(INITIAL_ADDRESSES[0]);
      const [orders, setOrders] = useState(INITIAL_ORDERS);
      const [tickets, setTickets] = useState(INITIAL_TICKETS);
      const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
      const [systemParams, setSystemParams] = useState(SYSTEM_PARAMS);

      // Giỏ hàng (Tách 2 nhóm: Mua sẵn & Đặt trước - OI-10, FR-MHTT-01)
      const [cart, setCart] = useState([
        { product: INITIAL_PRODUCTS[0], quantity: 2 }, // Cốm Tú Lệ (Preorder)
        { product: INITIAL_PRODUCTS[2], quantity: 1 }  // Thịt trâu gác bếp Sa Pa (Mua sẵn)
      ]);

      const [searchQuery, setSearchQuery] = useState('');
      const [selectedVoucherIds, setSelectedVoucherIds] = useState(['VC_FREESHIP25', 'VC_OCOP20']);
      const [customVoucherInput, setCustomVoucherInput] = useState('');
      const [voucherFilterTab, setVoucherFilterTab] = useState('all');

      // Tùy chọn Hộp quà & Lời nhắn khi Đặt hàng (FR-MHTT-04, BR-DAT-09)
      const [selectedGiftOption, setSelectedGiftOption] = useState(null); // null hoặc 'GIFT-01'
      const [giftMessage, setGiftMessage] = useState('');
      const [isGiftForOther, setIsGiftForOther] = useState(false); // Gửi tặng người khác (chỉ trả online, ẩn giá - BR-DAT-09, BR-QL-08)

      // Đồng hồ đếm ngược giữ hàng 15 phút (PAR-19, BR-TT-03)
      const [paymentCountdown, setPaymentCountdown] = useState(900); // 15 phút = 900 giây

      // Modals
      const [activeModal, setActiveModal] = useState(null);
      // 'product_detail' | 'checkout' | 'voucher_selector' | 'order_detail_tracking' | 'support_claim' | 'review_modal' | 'harvest_batch' | 'packing_order' | 'wallet_reconciliation' | 'trace_lot' | 'address_sheet' | 'htx_doc_modal' | 'cart_sheet'
      const [detailProduct, setDetailProduct] = useState(null);
      const [detailQuantity, setDetailQuantity] = useState(1);
      const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(INITIAL_ORDERS[0]);
      const [shippingType, setShippingType] = useState('express'); // 'express' (Tuyến Hỏa Tốc CT05 45k) | 'standard' (28k chỉ đồ khô)
      const [paymentMethod, setPaymentMethod] = useState('vietqr'); // 'vietqr' | 'wallet' | 'cod'
      const [checkoutStep, setCheckoutStep] = useState(1);
      const [toastMsg, setToastMsg] = useState(null);

      // Chế độ Mất mạng giả lập
      const [isOnline, setIsOnline] = useState(true);

      // Review Modal State (BR-DG-01..07)
      const [reviewOrder, setReviewOrder] = useState(null);
      const [reviewRating, setReviewRating] = useState(5);
      const [reviewComment, setReviewComment] = useState('');
      const [reviewPhotos, setReviewPhotos] = useState([]);

      // Support Claim Form State
      const [claimIssue, setClaimIssue] = useState('broken_cold_chain');
      const [claimSolution, setClaimSolution] = useState('refund');
      const [claimQrPhoto, setClaimQrPhoto] = useState(null);
      const [claimDamagedPhoto, setClaimDamagedPhoto] = useState(null);
      const [claimCustomerBank, setClaimCustomerBank] = useState('Vietcombank - 1023847599 (NGUYEN VAN AN)');

      // HTX Báo mẻ thu hoạch form
      const [batchSpecialty, setBatchSpecialty] = useState('Cốm Tú Lệ');
      const [batchQuantity, setBatchQuantity] = useState(150);
      const [batchDate, setBatchDate] = useState('2026-10-26');
      const [batchStep, setBatchStep] = useState(1);
      const [batchSaved, setBatchSaved] = useState(false);

      // Flash sale countdown timer
      const [countdown, setCountdown] = useState({ h: '02', m: '45', s: '18' });
      useEffect(() => {
        const interval = setInterval(() => {
          const now = new Date();
          const s = (59 - now.getSeconds()).toString().padStart(2, '0');
          const m = (59 - now.getMinutes()).toString().padStart(2, '0');
          setCountdown({ h: '01', m, s });
        }, 1000);
        return () => clearInterval(interval);
      }, []);

      // Đồng hồ đếm ngược 15 phút giữ hàng (PAR-19, BR-TT-03)
      useEffect(() => {
        if (checkoutStep === 2 || checkoutStep === 3) {
          const timer = setInterval(() => {
            setPaymentCountdown(prev => (prev > 0 ? prev - 1 : 0));
          }, 1000);
          return () => clearInterval(timer);
        }
      }, [checkoutStep]);

      const formatPaymentTimer = () => {
        const m = Math.floor(paymentCountdown / 60).toString().padStart(2, '0');
        const s = (paymentCountdown % 60).toString().padStart(2, '0');
        return \`\${m}:\${s}\`;
      };

      const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3200);
      };

      // Ghi nhật ký thao tác (Audit Log - BR-QL-05)
      const recordAuditLog = (actor, action, detail) => {
        const now = new Date();
        const timeStr = now.toLocaleDateString('vi-VN') + ' ' + now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const newLog = {
          id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
          time: timeStr,
          actor,
          action,
          detail,
          ip: '118.70.12.' + Math.floor(10 + Math.random() * 80)
        };
        setAuditLogs(prev => [newLog, ...prev]);
      };

      // Lọc sản phẩm
      const filteredProducts = useMemo(() => {
        return products
          .filter(p => originFilter === 'Tất cả' || p.originDistrict.toLowerCase().includes(originFilter.toLowerCase()))
          .filter(p => categoryFilter === 'all' || p.categoryType === categoryFilter)
          .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.originDistrict.toLowerCase().includes(searchQuery.toLowerCase()) || p.coopName.toLowerCase().includes(searchQuery.toLowerCase()));
      }, [products, originFilter, categoryFilter, searchQuery]);

      // Giỏ hàng phân nhóm Mua sẵn & Đặt trước (OI-10, FR-MHTT-01)
      const readyCartItems = useMemo(() => cart.filter(item => !item.product.isPreorder), [cart]);
      const preorderCartItems = useMemo(() => cart.filter(item => item.product.isPreorder), [cart]);

      const cartSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      }, [cart]);

      const hasFreshOrPreorderInCart = useMemo(() => {
        return cart.some(item => item.product.isPreorder || item.product.categoryType === 'fresh');
      }, [cart]);

      const shippingFee = useMemo(() => {
        return shippingType === 'standard' ? 28000 : 45000;
      }, [shippingType]);

      // Chi phí hộp quà
      const giftPackagingFee = useMemo(() => {
        if (!selectedGiftOption) return 0;
        const g = GIFT_SETS.find(item => item.id === selectedGiftOption);
        return g ? 40000 : 0;
      }, [selectedGiftOption]);

      // Danh sách voucher hợp lệ đang được chọn
      const appliedVouchers = useMemo(() => {
        return AVAILABLE_VOUCHERS.filter(v => selectedVoucherIds.includes(v.id));
      }, [selectedVoucherIds]);

      // Tổng số tiền giảm giá từ tất cả voucher được chọn (BR-KM-03, 04)
      const totalVoucherDiscount = useMemo(() => {
        return appliedVouchers.reduce((sum, v) => {
          if (cartSubtotal >= v.minSpend) {
            return sum + v.discountAmount;
          }
          return sum;
        }, 0);
      }, [appliedVouchers, cartSubtotal]);

      // Tổng thanh toán sau khi trừ toàn bộ các voucher được chọn
      const totalOrderAmount = useMemo(() => {
        return Math.max(0, cartSubtotal + shippingFee + giftPackagingFee - totalVoucherDiscount);
      }, [cartSubtotal, shippingFee, giftPackagingFee, totalVoucherDiscount]);

      // Tiền cọc 30% cho hàng Đặt trước (Preorder) theo PAR-18 (BR-TIEN-02)
      const depositAmount = useMemo(() => {
        return cart.reduce((sum, item) => {
          if (item.product.isPreorder) {
            return sum + Math.round(item.product.price * 0.3 * item.quantity);
          }
          return sum + item.product.price * item.quantity;
        }, 0);
      }, [cart]);

      const remainingCodAmount = useMemo(() => {
        return Math.max(0, totalOrderAmount - depositAmount);
      }, [totalOrderAmount, depositAmount]);

      // Quản lý voucher
      const toggleVoucher = (voucher) => {
        if (selectedVoucherIds.includes(voucher.id)) {
          setSelectedVoucherIds(prev => prev.filter(id => id !== voucher.id));
          showToast(\`Đã bỏ mã: \${voucher.code}\`);
        } else {
          setSelectedVoucherIds(prev => [...prev, voucher.id]);
          showToast(\`Đã áp dụng mã: \${voucher.code} (-\${formatMoney(voucher.discountAmount)})\`);
        }
      };

      const handleRemoveSingleVoucher = (voucherId) => {
        const v = AVAILABLE_VOUCHERS.find(item => item.id === voucherId);
        setSelectedVoucherIds(prev => prev.filter(id => id !== voucherId));
        if (v) showToast(\`Đã gỡ mã: \${v.code}\`);
      };

      const handleSelectAllEligibleVouchers = () => {
        const eligible = AVAILABLE_VOUCHERS.filter(v => cartSubtotal >= v.minSpend).map(v => v.id);
        if (eligible.length === 0) {
          showToast('Chưa có mã nào đủ điều kiện với giá trị giỏ hàng hiện tại.');
          return;
        }
        setSelectedVoucherIds(eligible);
        showToast(\`Đã chọn toàn bộ \${eligible.length} mã hợp lệ!\`);
      };

      const handleSelectBestVouchers = () => {
        const eligible = AVAILABLE_VOUCHERS.filter(v => cartSubtotal >= v.minSpend).map(v => v.id);
        if (eligible.length === 0) {
          showToast('Chưa có mã nào đủ điều kiện. Hãy thêm sản phẩm vào giỏ!');
          return;
        }
        setSelectedVoucherIds(eligible);
        showToast(\`Đã tối ưu: Áp dụng \${eligible.length} mã giảm sâu nhất!\`);
      };

      const handleClearAllVouchers = () => {
        setSelectedVoucherIds([]);
        showToast('Đã bỏ chọn toàn bộ mã giảm giá.');
      };

      const handleApplyCustomCode = () => {
        const clean = customVoucherInput.trim().toUpperCase();
        if (!clean) return;
        const found = AVAILABLE_VOUCHERS.find(v => v.code === clean);
        if (found) {
          if (!selectedVoucherIds.includes(found.id)) {
            setSelectedVoucherIds(prev => [...prev, found.id]);
            showToast(\`Thành công! Đã thêm mã \${found.code} (-\${formatMoney(found.discountAmount)})\`);
          } else {
            showToast(\`Mã \${found.code} đã được chọn từ trước.\`);
          }
          setCustomVoucherInput('');
        } else {
          showToast(\`Mã "\${clean}" không tồn tại hoặc đã hết lượt.\`);
        }
      };

      const handleAddToCart = (prod, qty = 1) => {
        setCart(prev => {
          const ex = prev.find(item => item.product.id === prod.id);
          if (ex) {
            return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + qty } : item);
          }
          return [...prev, { product: prod, quantity: qty }];
        });
        showToast(\`Đã thêm vào giỏ: \${qty} \${prod.unit} \${prod.name.slice(0, 22)}...\`);
      };

      // Đặt hàng & Tách đơn theo HTX (BR-DAT-02, BR-TIEN-01..04)
      const handlePlaceOrder = () => {
        if (cart.length === 0) {
          showToast('Giỏ hàng trống!');
          return;
        }
        // Kiểm tra lời nhắn quà tặng (chặn SĐT & link theo BR-DAT-09)
        if (giftMessage) {
          const hasPhoneOrLink = /(\\d{9,11})|(https?:\\/\\/)|(\\.com|\\.vn|\\.org)/i.test(giftMessage);
          if (hasPhoneOrLink) {
            showToast('⚠️ Lời nhắn không được chứa số điện thoại hoặc liên kết web (BR-DAT-09)!');
            return;
          }
        }

        // Tách đơn theo HTX (BR-DAT-02)
        const coopsInCart = [...new Set(cart.map(item => item.product.coopId))];
        const newOrdersCreated = coopsInCart.map((cId, idx) => {
          const coopItems = cart.filter(item => item.product.coopId === cId);
          const hasPreorder = coopItems.some(item => item.product.isPreorder);
          const cSubtotal = coopItems.reduce((s, it) => s + it.product.price * it.quantity, 0);
          const cDeposit = hasPreorder ? Math.round(cSubtotal * 0.3) : cSubtotal;
          const cRemaining = hasPreorder ? (cSubtotal - cDeposit) : 0;
          const coopObj = coops.find(c => c.id === cId) || { name: coopItems[0].product.coopName };

          return {
            id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
            createdAt: 'Hôm nay, ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            items: coopItems,
            coopId: cId,
            coopName: coopObj.name,
            address: selectedAddress,
            subtotal: cSubtotal,
            shippingFee: 45000,
            voucherDiscount: idx === 0 ? totalVoucherDiscount : 0,
            depositPaid: cDeposit,
            remainingCod: cRemaining,
            status: hasPreorder ? 'cho_thu_hoach' : (paymentMethod === 'cod' ? 'cho_xac_nhan' : 'cho_thanh_toan'),
            paymentStatus: hasPreorder ? 'Đã cọc 30% – còn 70%' : (paymentMethod === 'cod' ? 'Chưa thanh toán COD' : 'Đã thanh toán'),
            expectedDelivery: hasPreorder ? 'Giao mẻ thu hoạch: 26/10/2026' : 'Giao trong ngày về Hà Nội (Tây Mỗ)',
            isPreorder: hasPreorder,
            assignedShipper: 'Nguyễn Văn Thắng (Hub Tây Mỗ - Tuyến CT05)',
            currentTemp: '10.5°C (Đá gel bảo ôn)',
            driverPhone: '0912 345 678',
            giftMessage: giftMessage || null,
            isGiftForOther: isGiftForOther
          };
        });

        setOrders(prev => [...newOrdersCreated, ...prev]);
        setCart([]);
        setActiveModal(null);
        showToast(\`Đặt hàng thành công! Đã tạo \${newOrdersCreated.length} đơn hàng tách theo HTX (BR-DAT-02)\`);
        recordAuditLog('Khách hàng (Nguyễn Văn An)', 'Tạo đơn hàng mới', \`Đã tạo \${newOrdersCreated.length} đơn hàng gửi HTX\`);
        setCustomerTab('profile');
      };

      // Khách hàng hủy đơn (BR-HUY-01)
      const handleCustomerCancelOrder = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'da_huy', paymentStatus: o.depositPaid > 0 ? 'Đã hoàn tiền' : o.paymentStatus } : o));
        showToast(\`Đã huỷ đơn \${orderId}. Hệ thống nhả suất giữ hàng ngay (BR-HUY-01)!\`);
        recordAuditLog('Khách hàng (Nguyễn Văn An)', 'Hủy đơn hàng', \`Đơn \${orderId} được khách hủy hợp lệ\`);
      };

      // Khách hàng xác nhận đã nhận hàng (FR-DH-15, BR-VD-05)
      const handleCustomerConfirmReceived = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'da_giao', paymentStatus: 'Đã thanh toán' } : o));
        showToast(\`Đã xác nhận nhận hàng cho đơn \${orderId}! Mời bạn đánh giá sản phẩm.\`);
        recordAuditLog('Khách hàng (Nguyễn Văn An)', 'Xác nhận nhận hàng', \`Đơn \${orderId} chuyển trạng thái Đã giao\`);
      };

      // Gửi đánh giá sản phẩm (BR-DG-01..07)
      const handleSubmitReview = () => {
        if (!reviewOrder) return;
        if (reviewRating <= 2 && reviewComment.trim().length < 20) {
          showToast('⚠️ Đánh giá 1-2 sao bắt buộc nhập nhận xét từ 20 ký tự (BR-DG-02)!');
          return;
        }
        setOrders(prev => prev.map(o => o.id === reviewOrder.id ? { ...o, isReviewed: true } : o));
        setActiveModal(null);
        showToast('Cảm ơn bạn đã đánh giá nông sản chính ngạch Lào Cai!');
        recordAuditLog('Khách hàng (Nguyễn Văn An)', 'Đánh giá sản phẩm', \`Đánh giá \${reviewRating} sao cho đơn \${reviewOrder.id}\`);
      };

      // Gửi khiếu nại CSKH Ticket (FR-CSKH-01..09, BR-TCH-01..05)
      const handleSubmitClaimTicket = () => {
        if (!selectedTrackingOrder) return;
        const newTicket = {
          id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
          orderId: selectedTrackingOrder.id,
          customerName: 'Nguyễn Văn An',
          customerPhone: '0988 234 567',
          coopId: selectedTrackingOrder.coopId || 'coop-02',
          coopName: selectedTrackingOrder.coopName || 'HTX Tú Lệ',
          issueType: claimIssue,
          issueLabel: claimIssue === 'broken_cold_chain' ? 'Đứt gãy chuỗi lạnh đá gel' : claimIssue === 'damaged_30' ? 'Hàng dập nát >30%' : 'Thiếu hàng / sai hàng',
          priority: claimIssue === 'broken_cold_chain' ? 'urgent' : 'normal',
          status: 'investigating',
          customerNote: 'Khách hàng gửi yêu cầu bồi hoàn 100% kèm ảnh chụp mã QR và hàng thực tế.',
          coopResponse: 'HTX đã tiếp nhận thông tin và đang kiểm tra đối chiếu mẻ thu hoạch.',
          adminVerdict: 'Đang chờ Admin CSKH phân định lỗi và quyết định hoàn tiền.',
          refundAmount: selectedTrackingOrder.depositPaid + selectedTrackingOrder.remainingCod,
          customerBank: claimCustomerBank,
          createdAt: 'Hôm nay, ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };
        setTickets(prev => [newTicket, ...prev]);
        setOrders(prev => prev.map(o => o.id === selectedTrackingOrder.id ? { ...o, status: 'tra_hang_hoan_tien', paymentStatus: 'Chờ hoàn tiền' } : o));
        setActiveModal(null);
        showToast(\`Đã tạo Ticket khiếu nại \${newTicket.id}! CSKH sẽ phản hồi trong 60 phút.\`);
        recordAuditLog('Khách hàng (Nguyễn Văn An)', 'Gửi khiếu nại Ticket', \`Khiếu nại gắn đơn \${selectedTrackingOrder.id}\`);
      };

      // HTX Xác nhận đơn hàng (FR-DH-08)
      const handleCoopConfirmOrder = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'da_xac_nhan' } : o));
        showToast(\`HTX đã xác nhận đơn \${orderId}! Chuyển sang chuẩn bị đóng gói.\`);
        recordAuditLog('HTX Tú Lệ (Lù A Sáng)', 'Xác nhận đơn hàng', \`Đơn \${orderId} chuyển sang Đã xác nhận\`);
      };

      // HTX Từ chối đơn hàng (FR-DH-08, BR-HUY-04)
      const handleCoopRejectOrder = (orderId) => {
        const reason = prompt('Nhập lý do từ chối đơn hàng (Bắt buộc theo BR-HUY-04):', 'Thời tiết sương muối không thu hoạch kịp');
        if (!reason) return;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'da_huy', paymentStatus: 'Đã hoàn tiền' } : o));
        showToast(\`Đã từ chối đơn \${orderId}. Hoàn tiền 100% cho khách!\`);
        recordAuditLog('HTX Tú Lệ (Lù A Sáng)', 'Từ chối đơn hàng', \`Đơn \${orderId} bị từ chối với lý do: \${reason}\`);
      };

      // HTX Báo sẵn sàng giao hàng Preorder (FR-DH-17, BR-TT-08)
      const handleCoopReadyToShip = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'dang_chuan_bi' } : o));
        showToast(\`Đã báo sẵn sàng giao cho đơn \${orderId}! Kích hoạt thu nốt 70% còn lại.\`);
        recordAuditLog('HTX Tú Lệ (Lù A Sáng)', 'Báo sẵn sàng giao hàng', \`Đơn Preorder \${orderId} sẵn sàng bàn giao\`);
      };

      // HTX Bàn giao xe CT05 (FR-DH-09)
      const handleCoopHandoverToShipper = (orderId) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'dang_giao' } : o));
        showToast(\`Đã đóng gói bảo ôn đá gel & bàn giao đơn \${orderId} cho xe CT05!\`);
        recordAuditLog('HTX Tú Lệ (Lù A Sáng)', 'Bàn giao vận chuyển', \`Đơn \${orderId} đã giao chành xe CT05\`);
      };

      // Admin CSKH Phê duyệt hoàn tiền (FR-CSKH-09, BR-HOAN-06)
      const handleAdminApproveRefund = (ticketId) => {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved', adminVerdict: 'Kết luận: Lỗi vận chuyển đứt gãy nhiệt độ. Duyệt hoàn 100% về tài khoản khách.' } : t));
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          setOrders(prev => prev.map(o => o.id === ticket.orderId ? { ...o, paymentStatus: 'Đã hoàn tiền' } : o));
        }
        showToast(\`Admin CSKH đã phê duyệt bồi hoàn 100% cho ticket \${ticketId}!\`);
        recordAuditLog('Admin CSKH (Nguyễn Thu Hương)', 'Duyệt hoàn tiền Ticket', \`Ticket \${ticketId} được duyệt hoàn 100%\`);
      };

      // Admin Vận hành cập nhật tham số PAR (BR-HT-02)
      const handleUpdateSystemParam = (paramId, newVal) => {
        setSystemParams(prev => prev.map(p => p.id === paramId ? { ...p, value: newVal } : p));
        showToast(\`Đã cập nhật tham số \${paramId} = \${newVal}! Áp dụng cho các đơn hàng mới.\`);
        recordAuditLog('Admin Vận hành (Trần Minh Tuấn)', 'Cập nhật tham số PAR', \`Cập nhật \${paramId} thành \${newVal}\`);
      };

      return (
        <div className="w-full flex flex-col items-center justify-start min-h-screen py-2">

          {/* ========================================================
              TOP TOOLBAR: SWITCH ROLES & OFFLINE SIMULATOR
             ======================================================== */}
          <header className="w-full max-w-md px-3 py-1 flex flex-col items-center gap-1.5 z-50">
            {/* Offline simulation button */}
            <div className="w-full flex justify-between items-center text-[11px] text-stone-400 px-1">
              <span className="flex items-center gap-1 font-bold text-stone-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hệ Thống Đặc Sản Số Lào Cai</span>
              </span>
              <button
                onClick={() => {
                  setIsOnline(o => !o);
                  showToast(!isOnline ? 'Đã kết nối Internet thành công!' : 'Đã ngắt mạng! Bật chế độ đệm ngoại tuyến (Offline Sync)');
                }}
                className={\`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-colors \${
                  isOnline ? 'border-stone-700 bg-stone-800 text-stone-300' : 'border-amber-600 bg-amber-500 text-black'
                }\`}
              >
                <i className={\`fa-solid \${isOnline ? 'fa-wifi' : 'fa-plane'} mr-1\`}></i>
                {isOnline ? 'Giả lập Mất mạng' : 'Bật lại Online'}
              </button>
            </div>

            {/* Role Switcher (SRS Mục 2 & Mục 11) */}
            <div className="w-full bg-stone-900/90 backdrop-blur-md border border-stone-700/60 rounded-2xl p-1 shadow-2xl flex items-center justify-between overflow-x-auto no-scrollbar gap-1 text-[11px] font-bold text-stone-400">
              <button
                onClick={() => { setCurrentRole('customer'); showToast('Chế độ: Cư dân Hà Nội (Vinhomes Smart City)'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'customer' ? 'bg-[#EE4D2D] text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-basket-shopping"></i>
                <span>Khách hàng</span>
              </button>

              <button
                onClick={() => { setCurrentRole('coop'); showToast('Chế độ: Gian hàng / HTX Vùng Cao'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'coop' ? 'bg-emerald-800 text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-store"></i>
                <span>Gian hàng / HTX</span>
              </button>

              <button
                onClick={() => { setCurrentRole('shipper'); showToast('Chế độ: Giao Vận (Hub Tây Mỗ)'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'shipper' ? 'bg-sky-600 text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-motorcycle"></i>
                <span>Giao vận</span>
              </button>

              <button
                onClick={() => { setCurrentRole('ops'); showToast('Chế độ: Điều Phối Tuyến Xe CT05 & Chuỗi Lạnh'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'ops' ? 'bg-indigo-700 text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-satellite-dish"></i>
                <span>Điều phối Ops</span>
              </button>

              <button
                onClick={() => { setCurrentRole('regulator'); showToast('Chế độ: Giám sát CQQLNN (Ẩn 100% dữ liệu cá nhân)'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'regulator' ? 'bg-blue-800 text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-landmark"></i>
                <span>QLNN</span>
              </button>

              <button
                onClick={() => { setCurrentRole('admin'); showToast('Chế độ: Admin Portal Quản Trị Hệ Thống'); }}
                className={\`px-2.5 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 \${
                  currentRole === 'admin' ? 'bg-rose-800 text-white shadow-md' : 'hover:text-stone-200'
                }\`}
              >
                <i className="fa-solid fa-gear"></i>
                <span>Admin</span>
              </button>
            </div>
          </header>

          {/* ========================================================
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

            {/* Offline Notification Banner */}
            {!isOnline && (
              <div className="bg-amber-500 text-stone-950 px-3 py-1 text-[11px] font-bold flex items-center justify-between z-40">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>Ngoại tuyến: Lưu đệm dữ liệu & tự động đồng bộ khi có mạng</span>
                </span>
                <i className="fa-solid fa-rotate animate-spin text-[10px]"></i>
              </div>
            )}

            {/* Toast message popup */}
            {toastMsg && (
              <div className="absolute top-12 left-4 right-4 bg-stone-900/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-2xl shadow-xl z-50 flex items-center gap-2 border border-stone-700 animate-bounce">
                <i className="fa-solid fa-circle-check text-emerald-400"></i>
                <span className="flex-1 font-medium">{toastMsg}</span>
              </div>
            )}

            {/* MAIN APP BODY CONTAINER */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col pb-16">

              {/* ----------------------------------------------------
                  1. ROLE KHÁCH HÀNG (CUSTOMER VIEW)
                 ---------------------------------------------------- */}
              {currentRole === 'customer' && (
                <div className="flex flex-col flex-1">
                  
                  {/* TAB 1: KHÁM PHÁ (HOME) */}
                  {customerTab === 'home' && (
                    <div className="space-y-3">
                      {/* Search & Location Bar */}
                      <div className="bg-white px-3 pt-1 pb-2.5 border-b border-stone-200 sticky top-0 z-30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div
                            onClick={() => setActiveModal('address_sheet')}
                            className="flex items-center gap-1 text-stone-700 cursor-pointer hover:text-stone-900"
                          >
                            <i className="fa-solid fa-location-dot text-[#EE4D2D]"></i>
                            <span className="font-bold truncate max-w-[210px]">{selectedAddress.title}</span>
                            <i className="fa-solid fa-chevron-down text-[10px] text-stone-400"></i>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setActiveModal('voucher_selector')}
                              className="relative p-1.5 text-stone-700 hover:text-[#EE4D2D]"
                              title="Kho Voucher"
                            >
                              <i className="fa-solid fa-ticket text-base"></i>
                              {appliedVouchers.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#EE4D2D] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                  {appliedVouchers.length}
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => setActiveModal('cart_sheet')}
                              className="relative p-1.5 text-stone-700 hover:text-[#EE4D2D]"
                              title="Giỏ hàng"
                            >
                              <i className="fa-solid fa-cart-shopping text-base"></i>
                              {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#EE4D2D] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                  {cart.reduce((s, it) => s + it.quantity, 0)}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm Cốm Tú Lệ, Mận Tam Hoa, Thịt gác bếp, Cá hồi..."
                            className="w-full bg-stone-100 pl-8 pr-3 py-2 rounded-2xl text-xs border border-transparent focus:outline-none focus:bg-white focus:border-[#EE4D2D]"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-stone-400 text-xs"></i>
                        </div>
                      </div>

                      {/* HERO BANNER MOUNTAIN CONNECT */}
                      <div className="mx-3 rounded-3xl overflow-hidden shadow-sm relative aspect-[21/9] bg-stone-900">
                        <img
                          src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
                          alt="Đặc sản mùa vụ Lào Cai"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3.5 flex flex-col justify-end text-white">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="bg-[#EE4D2D] text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                              Pre-order Giữ Chỗ
                            </span>
                            <span className="text-[10px] text-amber-300 font-bold">
                              • Tuyến Hỏa Tốc CT05 Về Hà Nội
                            </span>
                          </div>
                          <h2 className="text-sm font-extrabold leading-tight">
                            Mùa Vụ Nếp Tan Tú Lệ & Mận Tam Hoa Mới
                          </h2>
                          <p className="text-[10px] text-stone-200 mt-0.5 line-clamp-1">
                            Đặt cọc 30% bảo chứng · Nông hộ Lù A Sáng (La Pán Tẩn) thu hái sáng sớm
                          </p>
                        </div>
                      </div>

                      {/* BỘ LỌC ĐỊA BÀN BẢN LÀNG TÂY BẮC */}
                      <div className="px-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                          <span>Khu Vực Bản Làng (Lào Cai & Yên Bái)</span>
                          <span className="text-[10px] text-stone-400 font-normal">Chỉ dẫn địa lý</span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                          {['Tất cả', 'Tú Lệ', 'Mù Cang Chải', 'Suối Giàng', 'La Pán Tẩn', 'Bắc Hà', 'Sa Pa'].map(orig => (
                            <button
                              key={orig}
                              onClick={() => setOriginFilter(orig)}
                              className={\`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap border \${
                                originFilter === orig
                                  ? 'bg-[#14532D] text-white border-[#14532D] shadow-xs'
                                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                              }\`}
                            >
                              {orig}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* PHÂN LOẠI NGÀNH HÀNG */}
                      <div className="px-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-700">
                          <span>Phân Loại Sản Phẩm</span>
                          <span className="text-[10px] text-stone-400 font-normal">Chuỗi bảo quản</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                          <button
                            onClick={() => setCategoryFilter('all')}
                            className={\`p-2 rounded-2xl border transition-all \${
                              categoryFilter === 'all'
                                ? 'bg-[#EE4D2D] text-white border-[#EE4D2D] font-bold shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200'
                            }\`}
                          >
                            <i className="fa-solid fa-border-all text-sm mb-1 block"></i>
                            <span className="text-[10px]">Tất cả</span>
                          </button>
                          <button
                            onClick={() => setCategoryFilter('seasonal_preorder')}
                            className={\`p-2 rounded-2xl border transition-all \${
                              categoryFilter === 'seasonal_preorder'
                                ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200'
                            }\`}
                          >
                            <i className="fa-solid fa-clock text-sm mb-1 block text-amber-500"></i>
                            <span className="text-[10px]">Theo mùa</span>
                          </button>
                          <button
                            onClick={() => setCategoryFilter('fresh')}
                            className={\`p-2 rounded-2xl border transition-all \${
                              categoryFilter === 'fresh'
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200'
                            }\`}
                          >
                            <i className="fa-solid fa-snowflake text-sm mb-1 block text-emerald-600"></i>
                            <span className="text-[10px]">Đồ tươi 2H</span>
                          </button>
                          <button
                            onClick={() => setCategoryFilter('dried')}
                            className={\`p-2 rounded-2xl border transition-all \${
                              categoryFilter === 'dried'
                                ? 'bg-orange-600 text-white border-orange-600 font-bold shadow-xs'
                                : 'bg-white text-stone-700 border-stone-200'
                            }\`}
                          >
                            <i className="fa-solid fa-cubes-stacked text-sm mb-1 block text-orange-600"></i>
                            <span className="text-[10px]">Đặc sản khô</span>
                          </button>
                        </div>
                      </div>

                      {/* FLASH SALE / GIÁ MÙA VỤ ƯU ĐÃI */}
                      <div className="mx-3 bg-gradient-to-r from-[#EE4D2D] to-[#FF7337] p-3 rounded-2xl text-white shadow-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
                            <i className="fa-solid fa-bolt-lightning text-amber-300"></i>
                            <span>Giá Mùa Vụ Ưu Đãi</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            <span>Kết thúc:</span>
                            <span className="bg-black/40 px-1 py-0.5 rounded text-[10px] tabular-nums font-mono">{countdown.h}</span>:
                            <span className="bg-black/40 px-1 py-0.5 rounded text-[10px] tabular-nums font-mono">{countdown.m}</span>:
                            <span className="bg-black/40 px-1 py-0.5 rounded text-[10px] tabular-nums font-mono">{countdown.s}</span>
                          </div>
                        </div>
                      </div>

                      {/* GRID SẢN PHẨM 2 CỘT */}
                      <div className="px-3 pb-4">
                        <div className="grid grid-cols-2 gap-2.5">
                          {filteredProducts.map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setDetailProduct(p);
                                setDetailQuantity(1);
                                setActiveModal('product_detail');
                              }}
                              className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                            >
                              <div className="relative aspect-square">
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
                                  <span className="bg-[#D0011B] text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                    Chính hãng
                                  </span>
                                  {p.isPreorder && (
                                    <span className="bg-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">
                                      Đặt trước 30%
                                    </span>
                                  )}
                                  {p.categoryType === 'fresh' && (
                                    <span className="bg-emerald-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">
                                      Hỏa tốc 2H
                                    </span>
                                  )}
                                </div>
                                <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[8px] font-semibold px-1.5 py-0.5 rounded">
                                  {p.originDistrict}
                                </div>
                              </div>

                              <div className="p-2 flex flex-col flex-1 justify-between gap-1.5">
                                <div>
                                  <h3 className="text-xs font-semibold text-stone-900 line-clamp-2 leading-tight">
                                    {p.name}
                                  </h3>
                                  <div className="flex items-center gap-1 text-[9px] text-[#0284C7] font-bold mt-0.5">
                                    <i className="fa-solid fa-circle-check text-[9px]"></i>
                                    <span>{p.certType}</span>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-sm font-extrabold text-[#EE4D2D] tabular-nums">
                                      {formatMoney(p.price)}
                                    </span>
                                    {p.originalPrice && (
                                      <span className="text-[10px] text-stone-400 line-through tabular-nums">
                                        {formatMoney(p.originalPrice)}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-500">
                                    <span>Đã bán {p.soldCount}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart(p, 1);
                                      }}
                                      className="w-6 h-6 rounded-full bg-red-50 text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white flex items-center justify-center transition-colors"
                                    >
                                      <i className="fa-solid fa-cart-plus text-[10px]"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: VỤ MÙA (SEASON PRE-ORDER) */}
                  {customerTab === 'season' && (
                    <div className="p-3.5 space-y-3">
                      <div className="bg-gradient-to-r from-emerald-950 to-[#14532D] text-white p-4 rounded-3xl shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-wheat-awn text-amber-400 text-lg"></i>
                          <div>
                            <h2 className="text-sm font-bold">Nông Sản Mùa Vụ Tây Bắc (Pre-order)</h2>
                            <p className="text-[11px] text-emerald-200">
                              Thu hái đúng độ ngon nhất · Cọc 30% bảo chứng · Giao tận cửa tại Hà Nội
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Danh sách mùa vụ */}
                      <div className="space-y-3">
                        {products.filter(p => p.isPreorder).map(p => (
                          <div
                            key={p.id}
                            className="bg-white p-3.5 rounded-3xl border border-stone-200 shadow-xs space-y-3"
                          >
                            <div className="flex gap-3">
                              <img src={p.image} alt={p.name} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    Cọc 30%: {formatMoney(Math.round(p.price * 0.3))}
                                  </span>
                                  <span className="text-[10px] text-stone-500 font-bold">{p.originDistrict}</span>
                                </div>
                                <h3 className="text-xs font-bold text-stone-900 mt-1 line-clamp-2">{p.name}</h3>
                                <div className="flex items-baseline gap-2 mt-1">
                                  <span className="text-sm font-black text-[#EE4D2D] tabular-nums">{formatMoney(p.price)}</span>
                                  <span className="text-[10px] text-stone-400">/{p.unit}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1.5">
                              <div className="flex justify-between items-center text-[11px]">
                                <span>Ngày dự kiến thu hoạch:</span>
                                <strong className="text-emerald-800">{p.preorderHarvestDate}</strong>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span>Suất đặt còn lại:</span>
                                <strong className="text-[#EE4D2D] tabular-nums font-bold">{p.preorderSlots} suất</strong>
                              </div>
                            </div>

                            {/* Timeline 4 mốc giờ từ vườn tới bàn ăn */}
                            {p.harvestTimeline && (
                              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-2">
                                <div className="font-bold text-stone-800 text-[11px] flex items-center gap-1.5">
                                  <i className="fa-solid fa-route text-emerald-700"></i>
                                  <span>Lịch trình từ vườn tới bàn ăn Hà Nội:</span>
                                </div>
                                <div className="space-y-1.5 pl-1 text-[11px] text-stone-600">
                                  {p.harvestTimeline.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <span className="text-emerald-800 font-bold shrink-0">{item.time}:</span>
                                      <span>{item.step}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                onClick={() => showToast(\`Đã kết nối nông hộ \${p.farmerName} qua hệ thống!\`)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                              >
                                <i className="fa-solid fa-comments text-stone-600"></i>
                                <span>Nhắn Nông Hộ</span>
                              </button>
                              <button
                                onClick={() => {
                                  setDetailProduct(p);
                                  setDetailQuantity(1);
                                  setActiveModal('checkout');
                                }}
                                className="bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs"
                              >
                                Đặt Trước Cọc 30%
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: QUÉT QR LÔ (GS1 / EPCIS TRACEABILITY) */}
                  {customerTab === 'trace' && (
                    <div className="p-3.5 space-y-3">
                      <div className="bg-sky-950 text-white p-4 rounded-3xl shadow-sm space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-sky-400">GS1 / EPCIS Blockchain Verify</span>
                          <span className="text-[9px] bg-sky-800 px-2 py-0.5 rounded-full font-bold">CQQLNN Bảo Chứng</span>
                        </div>
                        <h2 className="text-sm font-bold">Truy Xuất Nguồn Gốc Tem Mã Lô Nông Sản</h2>
                        <p className="text-[11px] text-sky-200">
                          Xác thực tọa độ vườn trồng, lịch sử canh tác & quy chuẩn chuỗi lạnh đá gel
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-3xl border border-stone-200 text-center space-y-3">
                        <div className="relative w-44 h-44 mx-auto border-2 border-dashed border-sky-600 rounded-3xl flex flex-col items-center justify-center bg-stone-50 overflow-hidden">
                          <i className="fa-solid fa-qrcode text-6xl text-sky-700/80"></i>
                          <div className="absolute inset-x-0 h-1 bg-sky-500 animate-scanline"></div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800">Mã Lô Đang Quét: LOT-YB-TL-260923</p>
                          <p className="text-[11px] text-stone-500">Mẻ Cốm Non Tú Lệ · Nông hộ Lù A Sáng (Bản La Pán Tẩn)</p>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText('LOT-YB-TL-260923');
                              showToast('Đã sao chép mã lô LOT-YB-TL-260923');
                            }}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-copy"></i>
                            <span>Sao Chép Mã Lô</span>
                          </button>
                          <button
                            onClick={() => setActiveModal('trace_lot')}
                            className="bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-circle-info"></i>
                            <span>Xem Hồ Sơ 5 Bước</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HỘP QUÀ TẶNG (GIFTS - BR-DAT-09) */}
                  {customerTab === 'gifts' && (
                    <div className="p-3.5 space-y-3">
                      <div className="bg-amber-950 text-white p-4 rounded-3xl shadow-sm space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-amber-400">Hộp Quà Eco-friendly</span>
                          <span className="text-[9px] bg-amber-800 px-2 py-0.5 rounded-full font-bold">Giấy Craft Mộc</span>
                        </div>
                        <h2 className="text-sm font-bold">Hộp Quà Đặc Sản Vùng Cao Trao Gửi Yêu Thương</h2>
                        <p className="text-[11px] text-amber-200">
                          Đóng gói sang trọng bằng vật liệu mộc · Tùy chọn gửi người khác giấu giá tiền (BR-DAT-09)
                        </p>
                      </div>

                      <div className="space-y-3">
                        {GIFT_SETS.map(g => (
                          <div key={g.id} className="bg-white p-3.5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200">
                              <img src={g.image} alt={g.name} className="w-full h-full object-cover" />
                              <span className="absolute top-2 left-2 bg-[#EE4D2D] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                                {g.badge}
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between items-baseline">
                                <h3 className="text-xs font-bold text-stone-900">{g.name}</h3>
                                <span className="text-sm font-extrabold text-[#EE4D2D] tabular-nums">{formatMoney(g.price)}</span>
                              </div>
                              <p className="text-[11px] text-stone-600 mt-1 leading-snug">{g.sub}</p>
                            </div>

                            <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200 text-[10px] text-stone-600 space-y-1">
                              <div>• <strong>Quy cách:</strong> {g.packaging}</div>
                              <div>• <strong>Phiếu giao hàng:</strong> Ẩn giá tiền nếu chọn gửi người khác (BR-QL-08)</div>
                            </div>

                            <button
                              onClick={() => {
                                handleAddToCart({
                                  id: g.id,
                                  name: g.name,
                                  price: g.price,
                                  unit: 'hộp quà',
                                  image: g.image,
                                  isPreorder: false,
                                  categoryType: 'dried',
                                  coopId: 'coop-02',
                                  coopName: 'HTX Nông Nghiệp & Dịch Vụ Tú Lệ'
                                }, 1);
                                setActiveModal('checkout');
                              }}
                              className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs"
                            >
                              Đặt Hộp Quà Giao Hà Nội ({formatMoney(g.price)})
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: TÀI KHOẢN & ĐƠN MUA CỦA TÔI (FR-DH-01, 11 TRẠNG THÁI) */}
                  {customerTab === 'profile' && (
                    <div className="p-3.5 space-y-3">
                      {/* User Profile Card */}
                      <div className="bg-gradient-to-r from-[#F53D2D] to-[#F63] p-4 rounded-3xl text-white shadow-md flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-white text-[#EE4D2D] font-black text-xl flex items-center justify-center border-2 border-white/60">
                          NA
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold">Nguyễn Văn An</h3>
                            <span className="text-[9px] bg-amber-400 text-stone-900 font-extrabold px-1.5 py-0.5 rounded-sm">
                              Cư Dân Smart City
                            </span>
                          </div>
                          <p className="text-xs text-red-100 mt-0.5">SĐT: 0988 234 567 (Đã xác thực OTP - FR-TK-01)</p>
                        </div>
                      </div>

                      {/* Quản lý Sổ Địa Chỉ */}
                      <div className="bg-white p-3.5 rounded-3xl shadow-xs border border-stone-200 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-900">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-map-location-dot text-[#EE4D2D]"></i>
                            <span>Sổ Địa Chỉ Nhận Hàng (Hà Nội)</span>
                          </span>
                          <button onClick={() => setActiveModal('address_sheet')} className="text-[#EE4D2D] hover:underline text-[11px]">
                            Đổi / Thêm mới
                          </button>
                        </div>
                        <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200 text-xs">
                          <div className="font-bold text-stone-800">{selectedAddress.title}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {selectedAddress.buildingBlock ? \`\${selectedAddress.buildingBlock}, \` : ''}{selectedAddress.streetDetails ? \`\${selectedAddress.streetDetails}, \` : ''}{selectedAddress.ward}, {selectedAddress.district}, Hà Nội
                          </div>
                        </div>
                      </div>

                      {/* Đơn Mua Của Tôi - 11 Trạng Thái Chuẩn (BR-VD-01) */}
                      <div className="bg-white p-3.5 rounded-3xl shadow-xs border border-stone-200 space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-bold text-stone-900">
                          <span>Đơn Hàng Của Tôi ({orders.length})</span>
                          <span className="text-[10px] text-stone-400">11 trạng thái chuẩn (BR-VD-01)</span>
                        </div>

                        {/* Status Filter Horizontal */}
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[10px]">
                          {[
                            { id: 'all', label: 'Tất cả' },
                            { id: 'dang_giao', label: 'Đang giao' },
                            { id: 'cho_thu_hoach', label: 'Chờ thu hoạch' },
                            { id: 'cho_xac_nhan', label: 'Chờ xác nhận' },
                            { id: 'da_giao', label: 'Đã giao' },
                            { id: 'tra_hang_hoan_tien', label: 'Khiếu nại/Hoàn tiền' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setOrderStatusFilter(tab.id)}
                              className={\`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-colors \${
                                orderStatusFilter === tab.id
                                  ? 'bg-stone-900 text-white'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }\`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Orders List */}
                        <div className="space-y-3 pt-1">
                          {orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).map(o => {
                            const statusInfo = ORDER_STATUS_LABELS[o.status] || { label: o.status, badge: 'bg-stone-100 text-stone-800', icon: 'fa-box' };
                            return (
                              <div key={o.id} className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <strong className="text-stone-900 font-mono">{o.id}</strong>
                                  <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 \${statusInfo.badge}\`}>
                                    <i className={\`fa-solid \${statusInfo.icon} text-[8px]\`}></i>
                                    <span>{statusInfo.label}</span>
                                  </span>
                                </div>

                                <div className="text-xs text-stone-700 space-y-1">
                                  {o.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{it.quantity} × {it.product.name}</span>
                                      <span className="font-bold tabular-nums text-stone-900">{formatMoney(it.product.price * it.quantity)}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-1.5 border-t border-stone-200/60 flex justify-between items-center text-[11px] text-stone-600">
                                  <span>{o.paymentStatus}</span>
                                  <strong className="text-[#EE4D2D] tabular-nums font-black text-xs">
                                    {formatMoney(o.subtotal + o.shippingFee - o.voucherDiscount)}
                                  </strong>
                                </div>

                                {/* Order Action Buttons */}
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  <button
                                    onClick={() => {
                                      setSelectedTrackingOrder(o);
                                      setActiveModal('order_detail_tracking');
                                    }}
                                    className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-[11px] font-bold py-1.5 rounded-xl flex items-center justify-center gap-1"
                                  >
                                    <i className="fa-solid fa-route text-sky-600"></i>
                                    <span>Chi Tiết Đơn</span>
                                  </button>

                                  {/* Action by Status */}
                                  {o.status === 'dang_giao' && (
                                    <button
                                      onClick={() => handleCustomerConfirmReceived(o.id)}
                                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold py-1.5 rounded-xl shadow-2xs"
                                    >
                                      Đã Nhận Hàng
                                    </button>
                                  )}

                                  {o.status === 'cho_xac_nhan' && (
                                    <button
                                      onClick={() => handleCustomerCancelOrder(o.id)}
                                      className="bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-[11px] font-bold py-1.5 rounded-xl"
                                    >
                                      Hủy Đơn Nhanh
                                    </button>
                                  )}

                                  {o.status === 'da_giao' && !o.isReviewed && (
                                    <button
                                      onClick={() => {
                                        setReviewOrder(o);
                                        setReviewRating(5);
                                        setReviewComment('');
                                        setActiveModal('review_modal');
                                      }}
                                      className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold py-1.5 rounded-xl"
                                    >
                                      ⭐ Đánh Giá
                                    </button>
                                  )}

                                  {o.status === 'da_giao' && (
                                    <button
                                      onClick={() => {
                                        setSelectedTrackingOrder(o);
                                        setActiveModal('support_claim');
                                      }}
                                      className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-1.5 rounded-xl"
                                    >
                                      Khiếu Nại 100%
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tài khoản nhận hoàn tiền đơn COD (BR-HOAN-05, BR-QL-04) */}
                      <div className="bg-white p-3.5 rounded-3xl shadow-xs border border-stone-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-shield-halved text-[#EE4D2D] text-base"></i>
                          <div>
                            <h4 className="text-xs font-bold text-stone-900">Tài Khoản Hoàn Tiền Đơn COD</h4>
                            <p className="text-[10px] text-stone-500">Bảo mật theo Nghị định 13 (Chỉ Admin Tài chính thấy - BR-QL-04)</p>
                          </div>
                        </div>
                        <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200 text-xs">
                          <div className="text-stone-500 text-[10px] uppercase font-bold">Vietcombank • 1023847599</div>
                          <div className="font-bold text-stone-800 uppercase text-xs">NGUYEN VAN AN</div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* 5 BOTTOM TABS CỦA KHÁCH HÀNG */}
                  <nav aria-label="Customer Navigation" className="fixed bottom-0 left-0 right-0 max-w-[393px] mx-auto bg-white border-t border-stone-200 py-1.5 px-1 flex items-center justify-around z-40 rounded-b-[44px] shadow-lg">
                    <button
                      onClick={() => setCustomerTab('home')}
                      className={\`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors \${
                        customerTab === 'home' ? 'text-[#EE4D2D] font-bold' : 'text-stone-400'
                      }\`}
                    >
                      <i className="fa-solid fa-house text-base"></i>
                      <span className="text-[9px]">Khám phá</span>
                    </button>

                    <button
                      onClick={() => setCustomerTab('season')}
                      className={\`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors \${
                        customerTab === 'season' ? 'text-[#14532D] font-bold' : 'text-stone-400'
                      }\`}
                    >
                      <i className="fa-solid fa-wheat-awn text-base"></i>
                      <span className="text-[9px]">Vụ mùa</span>
                    </button>

                    <button
                      onClick={() => setCustomerTab('trace')}
                      className={\`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors \${
                        customerTab === 'trace' ? 'text-sky-600 font-bold' : 'text-stone-400'
                      }\`}
                    >
                      <i className="fa-solid fa-qrcode text-base"></i>
                      <span className="text-[9px]">Quét QR Lô</span>
                    </button>

                    <button
                      onClick={() => setCustomerTab('gifts')}
                      className={\`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors \${
                        customerTab === 'gifts' ? 'text-amber-600 font-bold' : 'text-stone-400'
                      }\`}
                    >
                      <i className="fa-solid fa-gift text-base"></i>
                      <span className="text-[9px]">Hộp quà</span>
                    </button>

                    <button
                      onClick={() => setCustomerTab('profile')}
                      className={\`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors \${
                        customerTab === 'profile' ? 'text-[#EE4D2D] font-bold' : 'text-stone-400'
                      }\`}
                    >
                      <i className="fa-solid fa-user text-base"></i>
                      <span className="text-[9px]">Tài khoản</span>
                    </button>
                  </nav>

                </div>
              )}

              {/* ----------------------------------------------------
                  2. ROLE GIAN HÀNG / HTX (COOP ROLE - TOÀN DIỆN)
                 ---------------------------------------------------- */}
              {currentRole === 'coop' && (
                <div className="flex flex-col flex-1 p-3.5 space-y-3 bg-[#F5F5F5]">
                  {/* HTX Header Card */}
                  <div className="bg-emerald-950 text-white p-3.5 rounded-3xl shadow-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-emerald-400">HTX Nông Nghiệp & Dịch Vụ Tú Lệ</span>
                      <span className="text-[9px] bg-emerald-800 px-2 py-0.5 rounded-full font-bold">OCOP 5 Sao</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-800 text-white font-black text-lg flex items-center justify-center border border-emerald-700">
                        TL
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate">Lù A Sáng (Chủ nhiệm HTX)</h3>
                        <p className="text-[11px] text-stone-300">MST: 5200987654 · Bản La Pán Tẩn</p>
                      </div>
                    </div>

                    {/* Quick sub-tabs in HTX */}
                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-emerald-900/80 text-[10px]">
                      <button
                        onClick={() => setCoopTab('orders')}
                        className={\`py-1 rounded-lg text-center font-bold \${coopTab === 'orders' ? 'bg-emerald-800 text-white' : 'text-emerald-300 hover:text-white'}\`}
                      >
                        Đơn hàng
                      </button>
                      <button
                        onClick={() => setCoopTab('inventory')}
                        className={\`py-1 rounded-lg text-center font-bold \${coopTab === 'inventory' ? 'bg-emerald-800 text-white' : 'text-emerald-300 hover:text-white'}\`}
                      >
                        Tồn kho
                      </button>
                      <button
                        onClick={() => setCoopTab('reconciliation')}
                        className={\`py-1 rounded-lg text-center font-bold \${coopTab === 'reconciliation' ? 'bg-emerald-800 text-white' : 'text-emerald-300 hover:text-white'}\`}
                      >
                        Đối soát 4K
                      </button>
                      <button
                        onClick={() => setCoopTab('tickets')}
                        className={\`py-1 rounded-lg text-center font-bold \${coopTab === 'tickets' ? 'bg-emerald-800 text-white' : 'text-emerald-300 hover:text-white'}\`}
                      >
                        Khiếu nại
                      </button>
                    </div>
                  </div>

                  {/* SUB-VIEW 1: ĐƠN HÀNG HTX */}
                  {coopTab === 'orders' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Xử Lý Đơn Hàng HTX ({orders.length})</span>
                        <span className="text-[10px] text-stone-500">Xác nhận trong 24h (PAR-11)</span>
                      </div>

                      <div className="space-y-2.5">
                        {orders.map(o => (
                          <div key={o.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-stone-900 font-mono">{o.id}</span>
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                {ORDER_STATUS_LABELS[o.status]?.label || o.status}
                              </span>
                            </div>

                            <div className="text-xs text-stone-600 space-y-1">
                              {o.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{it.quantity} × {it.product.name}</span>
                                  <strong className="text-stone-900 tabular-nums">{formatMoney(it.product.price * it.quantity)}</strong>
                                </div>
                              ))}
                            </div>

                            <div className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-xl flex justify-between">
                              <span>Địa chỉ giao: {o.address?.title} ({o.address?.buildingBlock || o.address?.streetDetails})</span>
                              <span className="font-bold text-emerald-800 tabular-nums">{formatMoney(o.subtotal)}</span>
                            </div>

                            {/* HTX Action Buttons */}
                            <div className="flex gap-2 pt-1 text-xs">
                              {o.status === 'cho_xac_nhan' && (
                                <>
                                  <button
                                    onClick={() => handleCoopConfirmOrder(o.id)}
                                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl"
                                  >
                                    Xác Nhận Đơn
                                  </button>
                                  <button
                                    onClick={() => handleCoopRejectOrder(o.id)}
                                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold py-2 rounded-xl"
                                  >
                                    Từ Chối Đơn
                                  </button>
                                </>
                              )}

                              {o.status === 'cho_thu_hoach' && (
                                <button
                                  onClick={() => handleCoopReadyToShip(o.id)}
                                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
                                >
                                  <i className="fa-solid fa-bell"></i>
                                  <span>Báo Mẻ Thu Hoạch Sẵn Sàng (Kích hoạt 70% COD)</span>
                                </button>
                              )}

                              {o.status === 'dang_chuan_bi' && (
                                <button
                                  onClick={() => handleCoopHandoverToShipper(o.id)}
                                  className="w-full bg-sky-700 hover:bg-sky-800 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5"
                                >
                                  <i className="fa-solid fa-truck-ramp-box"></i>
                                  <span>Ghi Nhận Đóng Gói Đá Gel & Giao Xe CT05</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: TỒN KHO & TỒN KHẢ DỤNG (BR-TON-01..09) */}
                  {coopTab === 'inventory' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Quản Lý Tồn Kho & Tồn Khả Dụng</span>
                        <span className="text-[10px] text-stone-500">Tồn khả dụng = Tồn - Đang giữ</span>
                      </div>

                      <div className="space-y-2.5">
                        {products.map(p => {
                          const isLowStock = p.stockAvailable <= p.lowStockThreshold;
                          return (
                            <div key={p.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-stone-900">{p.name}</h4>
                                  <span className="text-[10px] text-stone-500">{p.certType} • {p.unit}</span>
                                </div>
                                {isLowStock && (
                                  <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <i className="fa-solid fa-triangle-exclamation"></i>
                                    <span>Tồn thấp (PAR-02)</span>
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-xl text-center text-xs">
                                <div>
                                  <span className="text-[10px] text-stone-500 block">Tồn kho tổng</span>
                                  <strong className="text-stone-900 tabular-nums">{p.stockTotal}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-amber-700 block">Đang giữ</span>
                                  <strong className="text-amber-700 tabular-nums">{p.stockReserved}</strong>
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-700 block">Tồn khả dụng</span>
                                  <strong className="text-emerald-800 tabular-nums font-black">{p.stockAvailable}</strong>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1 text-xs">
                                <button
                                  onClick={() => {
                                    const addQty = prompt(\`Nhập số lượng nhập thêm kho cho \${p.name}:\`, '50');
                                    if (addQty && !isNaN(addQty)) {
                                      const n = parseInt(addQty);
                                      setProducts(prev => prev.map(it => it.id === p.id ? { ...it, stockTotal: it.stockTotal + n, stockAvailable: it.stockAvailable + n } : it));
                                      showToast(\`Đã nhập thêm \${n} đơn vị vào kho!\`);
                                      recordAuditLog('HTX Tú Lệ', 'Cập nhật tồn kho', \`Nhập thêm \${n} \${p.unit} \${p.name}\`);
                                    }
                                  }}
                                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-center"
                                >
                                  Cập Nhật Số Lượng Tồn Kho
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: SỔ ĐỐI SOÁT 4 KHOẢN (FR-DT-02..05, BR-TC-01..05) */}
                  {coopTab === 'reconciliation' && (
                    <div className="space-y-3">
                      <div className="bg-emerald-900 text-white p-3.5 rounded-3xl shadow-xs space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-emerald-300 font-bold">Số Dư Khả Dụng Về Ví Agribank:</span>
                          <span className="bg-emerald-800 px-2 py-0.5 rounded-full text-[10px]">T+3 Kỳ 2</span>
                        </div>
                        <h3 className="text-2xl font-black tabular-nums">8.450.000đ</h3>
                        <div className="text-[11px] text-stone-200 flex justify-between pt-1 border-t border-emerald-800">
                          <span>Tiền giữ lại bảo chứng (Holdback 48h):</span>
                          <strong className="text-amber-300 tabular-nums">3.120.000đ</strong>
                        </div>
                      </div>

                      {/* Bảng Kê Đối Soát 4 Khoản Chi Tiết */}
                      <div className="bg-white p-3.5 rounded-3xl border border-stone-200 space-y-2 text-xs shadow-xs">
                        <div className="flex justify-between items-center font-bold text-stone-800 border-b pb-1.5">
                          <span>Sổ Đối Soát 4 Khoản Định Kỳ</span>
                          <span className="text-emerald-700">Đã chốt (Khóa sổ)</span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-stone-600">
                          <div className="flex justify-between">
                            <span>1. Tiền hàng thực tế (Gross Sales):</span>
                            <strong className="text-emerald-800 tabular-nums">+9.200.000đ</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>2. Hoa hồng hỗ trợ OCOP (8% trên tiền hàng):</span>
                            <strong className="text-rose-600 tabular-nums">-736.000đ</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>3. Phí vận chuyển chuỗi lạnh (ĐVVC thu):</span>
                            <strong className="text-stone-600 tabular-nums">0đ (Không tính vào DT)</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>4. Khoản trừ bồi hoàn dập nát:</span>
                            <strong className="text-rose-600 tabular-nums">-14.000đ</strong>
                          </div>
                          <div className="flex justify-between font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                            <span>Thực nhận chi trả HTX:</span>
                            <span className="text-emerald-800 tabular-nums font-black text-sm">+8.450.000đ</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => showToast('Đã gửi yêu cầu rút 8.450.000đ về Agribank CN Mù Cang Chải!')}
                        className="w-full bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold py-3.5 rounded-2xl shadow-md"
                      >
                        Yêu Cầu Rút Tiền Về Agribank
                      </button>
                    </div>
                  )}

                  {/* SUB-VIEW 4: PHẢN HỒI KHIẾU NẠI TICKET (BR-TCH-02) */}
                  {coopTab === 'tickets' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Khiếu Nại Cần Phản Hồi ({tickets.length})</span>
                        <span className="text-[10px] text-stone-500">HTX không được tự đóng ticket (BR-TCH-02)</span>
                      </div>

                      <div className="space-y-2.5">
                        {tickets.map(t => (
                          <div key={t.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-stone-900">{t.id} • {t.orderId}</span>
                              <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full \${t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'}\`}>
                                {t.priority === 'urgent' ? 'Khẩn cấp' : 'Thường'}
                              </span>
                            </div>

                            <div className="bg-stone-50 p-2 rounded-xl text-stone-700">
                              <strong>Lý do:</strong> {t.issueLabel}
                              <p className="text-[11px] text-stone-500 mt-0.5">{t.customerNote}</p>
                            </div>

                            <div className="bg-emerald-50/60 p-2 rounded-xl text-emerald-950 text-[11px]">
                              <strong>Ý kiến HTX:</strong> {t.coopResponse}
                            </div>

                            <button
                              onClick={() => {
                                const resp = prompt('Nhập nội dung giải trình / phản hồi của HTX:', 'HTX đã kiểm tra quy trình đóng gói và gửi hình ảnh đối chứng.');
                                if (resp) {
                                  setTickets(prev => prev.map(it => it.id === t.id ? { ...it, coopResponse: resp } : it));
                                  showToast('Đã gửi phản hồi ticket tới Admin CSKH!');
                                }
                              }}
                              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 rounded-xl text-center"
                            >
                              Gửi Phản Hồi / Bổ Sung Minh Chứng
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ----------------------------------------------------
                  3. ROLE GIAO VẬN (SHIPPER - HUB TÂY MỖ VINHOMES)
                 ---------------------------------------------------- */}
              {currentRole === 'shipper' && (
                <div className="flex flex-col flex-1 p-3.5 space-y-3 bg-[#F5F5F5]">
                  <div className="bg-sky-950 text-white p-3.5 rounded-3xl shadow-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-sky-400">Đội Ngũ Giao Vận Hà Nội</span>
                      <span className="text-[9px] bg-sky-800 px-2 py-0.5 rounded-full font-bold">Hub Tây Mỗ</span>
                    </div>
                    <h3 className="text-sm font-bold">Nguyễn Văn Thắng (Shipper Vinhomes Smart City)</h3>
                    <p className="text-[11px] text-sky-200">Phụ trách giao nội khu: Phân khu Sapphire 1..4, Masteri, Tonkin</p>
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                    <span>Kiện Hàng Cần Giao Tại Smart City</span>
                    <button
                      onClick={() => setActiveModal('shipper_scan')}
                      className="text-sky-700 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <i className="fa-solid fa-qrcode"></i>
                      <span>Quét QR Kiện Hàng</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {orders.filter(o => o.status === 'dang_giao').map(o => (
                      <div key={o.id} className="bg-white p-3.5 rounded-3xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <strong className="font-mono text-stone-900">{o.id}</strong>
                          <span className="bg-sky-100 text-sky-900 text-[9px] font-bold px-2 py-0.5 rounded-full">
                            Đang trên đường giao
                          </span>
                        </div>

                        <div className="text-stone-700 space-y-0.5 text-[11px]">
                          <div>• <strong>Người nhận:</strong> {o.address?.receiverName} - {o.address?.receiverPhone}</div>
                          <div>• <strong>Địa chỉ:</strong> {o.address?.buildingBlock}, {o.address?.title}</div>
                          <div>• <strong>Thu hộ COD:</strong> <span className="text-[#EE4D2D] font-bold tabular-nums">{formatMoney(o.remainingCod)}</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => {
                              setOrders(prev => prev.map(it => it.id === o.id ? { ...it, status: 'da_giao', paymentStatus: 'Đã thanh toán' } : it));
                              showToast(\`Đã giao thành công đơn \${o.id} tại sảnh!\`);
                              recordAuditLog('Shipper (Nguyễn Văn Thắng)', 'Giao hàng thành công', \`Đơn \${o.id} đã giao khách\`);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl"
                          >
                            ✓ Giao Thành Công
                          </button>

                          <button
                            onClick={() => {
                              const reason = prompt('Nhập lý do giao thất bại (Hẹn lại / Không liên lạc được):', 'Khách bận họp, hẹn giao sau 18h');
                              if (reason) {
                                showToast(\`Đã ghi nhận giao thất bại đơn \${o.id} với lý do: \${reason}\`);
                                recordAuditLog('Shipper (Nguyễn Văn Thắng)', 'Giao thất bại', \`Đơn \${o.id} hẹn lại: \${reason}\`);
                              }
                            }}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 rounded-xl"
                          >
                            Hẹn Lại Giờ Giao
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  4. ROLE ĐIỀU PHỐI VẬN HÀNH (OPS - TUYẾN XE CT05)
                 ---------------------------------------------------- */}
              {currentRole === 'ops' && (
                <div className="flex flex-col flex-1 p-3.5 space-y-3 bg-[#F5F5F5]">
                  <div className="bg-indigo-950 text-white p-3.5 rounded-3xl shadow-sm space-y-1">
                    <span className="text-[10px] font-bold uppercase text-indigo-400">Trung Tâm Điều Vận CT05</span>
                    <h3 className="text-sm font-bold">Giám Sát Chuỗi Lạnh Xe Khách Tuyến Lào Cai - Hà Nội</h3>
                    <p className="text-[10px] text-indigo-200">Cảm biến nhiệt độ IoT & định vị GPS thời gian thực</p>
                  </div>

                  {/* 4 Chỉ số KPI Ops */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-400 block font-bold">ĐANG TRÊN XE CT05</span>
                      <strong className="text-base font-black text-indigo-800 tabular-nums">45 Kiện</strong>
                      <span className="text-[9px] text-emerald-700 block">Nhiệt độ TB 11.2°C</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[10px] text-stone-400 block font-bold">CHỜ XỬ LÝ TẠI HUB</span>
                      <strong className="text-base font-black text-amber-700 tabular-nums">18 Đơn</strong>
                      <span className="text-[9px] text-stone-400 block">Kho Tây Mỗ & Cầu Giấy</span>
                    </div>
                  </div>

                  {/* Bảng theo dõi xe chuyên tuyến */}
                  <div className="bg-white p-3.5 rounded-3xl border border-stone-200 space-y-2 text-xs shadow-xs">
                    <h4 className="font-bold uppercase text-stone-800">Lộ Trình Xe Lạnh Chuyên Tuyến</h4>
                    <div className="space-y-1.5 text-[11px] text-stone-600">
                      <div className="flex justify-between py-1 border-b">
                        <span>Xe CT05-88 (Hưng Thành):</span>
                        <strong className="text-emerald-700">Đang qua Yên Bái (ETA: 16:30)</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span>Nhiệt độ thùng xe:</span>
                        <strong className="text-emerald-700 font-mono">11.5°C (Đạt chuẩn chuỗi lạnh)</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Điểm trả hàng:</span>
                        <strong className="text-stone-900">Hub Tây Mỗ (Vinhomes Smart City)</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  5. ROLE CƠ QUAN QLNN (READ-ONLY, ẨN DỮ LIỆU CÁ NHÂN THEO NĐ 13)
                 ---------------------------------------------------- */}
              {currentRole === 'regulator' && (
                <div className="flex flex-col flex-1 p-3.5 space-y-3 bg-[#F5F5F5]">
                  <div className="bg-blue-950 text-white p-3.5 rounded-3xl shadow-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-blue-300">Cơ Quan Quản Lý Nhà Nước</span>
                      <span className="text-[9px] bg-blue-800 px-2 py-0.5 rounded-full font-bold">Chỉ Đọc (BRQ-06)</span>
                    </div>
                    <h3 className="text-sm font-bold">Báo Cáo Giám Sát Nguồn Gốc Đặc Sản Lào Cai</h3>
                    <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                      <i className="fa-solid fa-shield-halved"></i>
                      <span>Tuân thủ Nghị định 13/2023/NĐ-CP: Đã ẩn 100% dữ liệu cá nhân cư dân</span>
                    </p>
                  </div>

                  {/* 3 CHỈ SỐ GIÁM SÁT CHÍNH THỨC THEO BRQ-06 */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[9px] text-stone-500 block font-bold">HTX HOẠT ĐỘNG</span>
                      <h4 className="text-base font-black text-blue-900 mt-1 tabular-nums">12 HTX</h4>
                      <span className="text-[8px] text-emerald-700">100% duyệt MST</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[9px] text-stone-500 block font-bold">SP XÁC MINH OCOP</span>
                      <h4 className="text-base font-black text-amber-700 mt-1 tabular-nums">36 SP</h4>
                      <span className="text-[8px] text-amber-700">3–5 Sao & VietGAP</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[9px] text-stone-500 block font-bold">KHIẾU NẠI ĐANG XỬ LÝ</span>
                      <h4 className="text-base font-black text-rose-700 mt-1 tabular-nums">2 Vụ</h4>
                      <span className="text-[8px] text-rose-600">Giám sát CSKH</span>
                    </div>
                  </div>

                  {/* Báo cáo lưu chuyển sản lượng theo địa phương */}
                  <div className="bg-white p-3.5 rounded-3xl border border-stone-200 space-y-2 text-xs shadow-xs">
                    <h4 className="font-bold uppercase text-stone-800">Sản Lượng Nông Sản Đã Về Hà Nội Tuần Này</h4>
                    <div className="space-y-1.5 text-stone-600 text-[11px]">
                      <div className="flex justify-between py-1 border-b">
                        <span>Huyện Mù Cang Chải / Tú Lệ (Cốm, Nếp):</span>
                        <strong className="text-stone-900 tabular-nums">1.850 kg</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span>Huyện Bắc Hà (Mận Tam Hoa, Mật ong):</span>
                        <strong className="text-stone-900 tabular-nums">1.200 kg</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span>Thị xã Sa Pa (Cá hồi, Thịt trâu):</span>
                        <strong className="text-stone-900 tabular-nums">640 kg</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Huyện Văn Chấn (Trà Shan Tuyết):</span>
                        <strong className="text-stone-900 tabular-nums">350 kg</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------
                  6. ROLE ADMIN PORTAL (5 PHÂN HỆ CHUYÊN TRÁCH)
                 ---------------------------------------------------- */}
              {currentRole === 'admin' && (
                <div className="flex flex-col flex-1 p-3.5 space-y-3 bg-[#F5F5F5]">
                  <div className="bg-rose-950 text-white p-3.5 rounded-3xl shadow-sm space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-rose-400">Admin Portal Hệ Thống</span>
                    <h3 className="text-sm font-bold">Trung Tâm Quản Trị & Kiểm Soát Nền Tảng</h3>
                    
                    {/* Admin 5 Tabs Navigation */}
                    <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-rose-900/80 text-[9px] font-bold text-center">
                      <button
                        onClick={() => setAdminTab('operations')}
                        className={\`py-1 rounded-lg \${adminTab === 'operations' ? 'bg-rose-800 text-white' : 'text-rose-300'}\`}
                      >
                        Vận hành
                      </button>
                      <button
                        onClick={() => setAdminTab('quality')}
                        className={\`py-1 rounded-lg \${adminTab === 'quality' ? 'bg-rose-800 text-white' : 'text-rose-300'}\`}
                      >
                        Duyệt HTX
                      </button>
                      <button
                        onClick={() => setAdminTab('cskh')}
                        className={\`py-1 rounded-lg \${adminTab === 'cskh' ? 'bg-rose-800 text-white' : 'text-rose-300'}\`}
                      >
                        CSKH
                      </button>
                      <button
                        onClick={() => setAdminTab('finance')}
                        className={\`py-1 rounded-lg \${adminTab === 'finance' ? 'bg-rose-800 text-white' : 'text-rose-300'}\`}
                      >
                        Tài chính
                      </button>
                      <button
                        onClick={() => setAdminTab('audit')}
                        className={\`py-1 rounded-lg \${adminTab === 'audit' ? 'bg-rose-800 text-white' : 'text-rose-300'}\`}
                      >
                        Nhật ký
                      </button>
                    </div>
                  </div>

                  {/* ADMIN TAB 1: VẬN HÀNH & THAM SỐ HỆ THỐNG PAR (BR-HT-02) */}
                  {adminTab === 'operations' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Cấu Hình Tham Số PAR (BR-HT-02)</span>
                        <span className="text-[10px] text-stone-500">Chỉ áp dụng cho đơn mới</span>
                      </div>

                      <div className="space-y-2">
                        {systemParams.map(p => (
                          <div key={p.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-stone-900">{p.id} • {p.label}</span>
                              <strong className="text-[#EE4D2D] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200 tabular-nums">
                                {p.value}
                              </strong>
                            </div>
                            <p className="text-[11px] text-stone-500">{p.desc}</p>
                            <button
                              onClick={() => {
                                const nv = prompt(\`Cập nhật giá trị mới cho \${p.label}:\`, p.value);
                                if (nv) handleUpdateSystemParam(p.id, nv);
                              }}
                              className="text-[10px] font-bold text-sky-700 hover:underline pt-0.5"
                            >
                              Chỉnh sửa giá trị tham số
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB 2: KIỂM SOÁT CHẤT LƯỢNG & DUYỆT HTX (FR-TK-08, 09, FR-SP-04) */}
                  {adminTab === 'quality' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Hồ Sơ HTX Chờ Duyệt (FR-TK-08, 09)</span>
                        <span className="text-[10px] text-stone-500">Duyệt ≤ 24h làm việc</span>
                      </div>

                      <div className="space-y-2.5">
                        {coops.map(c => (
                          <div key={c.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-stone-900">{c.name}</h4>
                              <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full \${
                                c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }\`}>
                                {c.status === 'approved' ? 'Đã duyệt hồ sơ' : 'Chờ thẩm định'}
                              </span>
                            </div>

                            <div className="text-[11px] text-stone-600 space-y-0.5 bg-stone-50 p-2 rounded-xl">
                              <div>• <strong>Mã số thuế:</strong> {c.taxCode} (Chính ngạch)</div>
                              <div>• <strong>Người đại diện:</strong> {c.representative}</div>
                              <div>• <strong>Chứng nhận:</strong> {c.ocopCert}</div>
                            </div>

                            {c.status === 'pending_approval' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    setCoops(prev => prev.map(it => it.id === c.id ? { ...it, status: 'approved' } : it));
                                    showToast(\`Đã phê duyệt hồ sơ cho \${c.name}!\`);
                                    recordAuditLog('Admin Chất lượng (Lê Thanh Hà)', 'Phê duyệt HTX', \`Duyệt mở bán cho \${c.name}\`);
                                  }}
                                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 rounded-xl"
                                >
                                  Phê Duyệt Mở Bán
                                </button>
                                <button
                                  onClick={() => {
                                    const r = prompt('Lý do yêu cầu bổ sung giấy tờ:', 'Thiếu ảnh Quyết định OCOP công chứng');
                                    if (r) {
                                      showToast(\`Đã yêu cầu bổ sung hồ sơ cho \${c.name}!\`);
                                      recordAuditLog('Admin Chất lượng (Lê Thanh Hà)', 'Yêu cầu bổ sung hồ sơ', \`Yêu cầu \${c.name}: \${r}\`);
                                    }
                                  }}
                                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 rounded-xl"
                                >
                                  Yêu Cầu Bổ Sung
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB 3: CSKH & XỬ LÝ KHIẾU NẠI (FR-CSKH-07, 09, BR-TCH-03) */}
                  {adminTab === 'cskh' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Xử Lý Ticket Khiếu Nại (Admin CSKH)</span>
                        <span className="text-[10px] text-rose-600 font-bold">SLA khẩn cấp ≤ 1h</span>
                      </div>

                      <div className="space-y-2.5">
                        {tickets.map(t => (
                          <div key={t.id} className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-stone-900">{t.id} • {t.orderId}</span>
                              <span className={\`text-[9px] font-bold px-2 py-0.5 rounded-full \${t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'}\`}>
                                {t.priority === 'urgent' ? 'Khẩn cấp' : 'Thường'}
                              </span>
                            </div>

                            <div className="text-[11px] text-stone-700 bg-stone-50 p-2 rounded-xl space-y-1">
                              <div>• <strong>Khách hàng:</strong> {t.customerName} ({t.customerPhone})</div>
                              <div>• <strong>Sự cố:</strong> {t.issueLabel}</div>
                              <div>• <strong>Nội dung:</strong> {t.customerNote}</div>
                              <div>• <strong>HTX giải trình:</strong> {t.coopResponse}</div>
                              <div>• <strong>Kết luận CSKH:</strong> {t.adminVerdict}</div>
                            </div>

                            {t.status === 'investigating' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleAdminApproveRefund(t.id)}
                                  className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 rounded-xl"
                                >
                                  Duyệt Hoàn Tiền 100%
                                </button>
                                <button
                                  onClick={() => {
                                    setTickets(prev => prev.map(it => it.id === t.id ? { ...it, status: 'resolved', adminVerdict: 'Đã giải quyết thỏa thuận gửi bù mẻ mới.' } : it));
                                    showToast(\`Đã đóng ticket \${t.id}!\`);
                                  }}
                                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2 rounded-xl"
                                >
                                  Đóng Ticket
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB 4: TÀI CHÍNH & QUYẾT TOÁN 4 KHOẢN (FR-DT-02..05, BR-TC-01..05) */}
                  {adminTab === 'finance' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Quyết Toán Kỳ 2 & Duyệt Hoàn Tiền</span>
                        <span className="text-[10px] text-emerald-800 font-bold">Admin Tài Chính</span>
                      </div>

                      {/* Danh sách hoàn tiền cho khách hàng (Bảo mật số TK ngân hàng - BR-QL-04) */}
                      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <div className="font-bold text-stone-900 border-b pb-1 flex items-center justify-between">
                          <span>Lệnh Hoàn Tiền Đơn Hàng (COD / Online)</span>
                          <span className="text-[9px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold">Chỉ Admin Tài Chính thấy STK</span>
                        </div>
                        <div className="bg-stone-50 p-2.5 rounded-xl text-[11px] text-stone-700 space-y-1">
                          <div className="flex justify-between">
                            <span>Đơn #ORD-2609-5502:</span>
                            <strong className="text-rose-700 tabular-nums">385.000đ</strong>
                          </div>
                          <div className="text-stone-500">
                            STK nhận: <strong>Vietcombank - 1023847599 (NGUYEN VAN AN)</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            showToast('Đã thực hiện lệnh chuyển khoản hoàn tiền 385.000đ cho khách qua cổng ngân hàng!');
                            recordAuditLog('Admin Tài chính (Đỗ Quang Dũng)', 'Hoàn tiền đơn hàng', 'Đã chuyển 385.000đ cho khách đơn ORD-2609-5502');
                          }}
                          className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 rounded-xl text-center"
                        >
                          Xác Nhận Chuyển Tiền Hoàn 100%
                        </button>
                      </div>

                      {/* Bảng Kê Đối Soát 4 Khoản Của Các HTX */}
                      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-2 text-xs">
                        <div className="font-bold text-stone-900 border-b pb-1">
                          Bảng Kê Đối Soát 4 Khoản (Kỳ T+3)
                        </div>
                        <div className="space-y-1.5 text-[11px] text-stone-600">
                          <div className="flex justify-between">
                            <span>HTX Tú Lệ (Gross Sales 9.200k, Hoa hồng -736k):</span>
                            <strong className="text-emerald-800 tabular-nums">8.450.000đ</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>HTX Bắc Hà (Gross Sales 6.100k, Hoa hồng -488k):</span>
                            <strong className="text-emerald-800 tabular-nums">5.612.000đ</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            showToast('Đã chốt sổ đối soát Kỳ 2 và phát hành lệnh chi trả Agribank cho tất cả HTX!');
                            recordAuditLog('Admin Tài chính (Đỗ Quang Dũng)', 'Chốt kỳ đối soát', 'Đã chốt kỳ quyết toán T+3 cho các HTX');
                          }}
                          className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-center"
                        >
                          Chốt Kỳ & Ký Duyệt Bảng Kê Chi Trả
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ADMIN TAB 5: NHẬT KÝ THAO TÁC AUDIT LOG (BR-QL-05, FR-HT-03) */}
                  {adminTab === 'audit' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-stone-800">
                        <span>Nhật Ký Thao Tác Hệ Thống (Audit Log)</span>
                        <span className="text-[10px] text-stone-500">Bất biến, không sửa không xoá (BR-QL-05)</span>
                      </div>

                      <div className="space-y-2">
                        {auditLogs.map(log => (
                          <div key={log.id} className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-xs text-xs space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono">
                              <span>{log.id} • {log.time}</span>
                              <span>IP: {log.ip}</span>
                            </div>
                            <div className="font-bold text-stone-900">{log.action}</div>
                            <div className="text-[11px] text-stone-600">{log.detail}</div>
                            <div className="text-[10px] text-stone-500 italic">Thực hiện bởi: {log.actor}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-stone-300 rounded-full z-50 pointer-events-none"></div>

            {/* ========================================================
                CÁC MODAL HỆ THỐNG ĐẶC TẢ TRONG SRS
               ======================================================== */}

            {/* 1. PRODUCT DETAIL MODAL */}
            {activeModal === 'product_detail' && detailProduct && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[90%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-[#D0011B] text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">
                          Chính hãng
                        </span>
                        <span className="bg-emerald-100 text-emerald-900 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                          {detailProduct.categoryLabel}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 mt-1">{detailProduct.name}</h3>
                      <span className="text-[11px] text-stone-500">{detailProduct.coopName}</span>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-stone-200">
                    <img src={detailProduct.image} alt={detailProduct.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setActiveModal('trace_lot')}
                      className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                    >
                      <i className="fa-solid fa-certificate text-sky-400"></i>
                      Xem nguồn gốc Lô QR
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{detailProduct.description}</p>

                  {/* Preorder Notice */}
                  {detailProduct.isPreorder ? (
                    <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <i className="fa-solid fa-clock"></i>
                        <span>Quy trình thanh toán Đặt Trước (Preorder) 2 bước:</span>
                      </div>
                      <div>• Bước 1: Cọc 30% Online qua VietQR (<span className="tabular-nums font-bold">{formatMoney(Math.round(detailProduct.price * 0.3 * detailQuantity))}</span>)</div>
                      <div>• Bước 2: Thanh toán 70% còn lại khi nhận hàng tại Hà Nội (<span className="tabular-nums font-bold">{formatMoney(Math.round(detailProduct.price * 0.7 * detailQuantity))}</span>)</div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <i className="fa-solid fa-truck-fast text-emerald-700"></i>
                      <span>Sẵn sàng giao hỏa tốc trong ngày tại Hà Nội qua tuyến xe CT05.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <span className="text-xs font-semibold">Số lượng đặt:</span>
                    <div className="flex items-center gap-3 bg-stone-100 rounded-lg px-2 py-1">
                      <button onClick={() => setDetailQuantity(q => Math.max(1, q - 1))} className="font-bold px-2">-</button>
                      <span className="font-bold text-xs">{detailQuantity}</span>
                      <button onClick={() => setDetailQuantity(q => q + 1)} className="font-bold px-2">+</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        handleAddToCart(detailProduct, detailQuantity);
                        setActiveModal(null);
                      }}
                      className="bg-amber-100 text-[#EE4D2D] hover:bg-amber-200 text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-1.5"
                    >
                      <i className="fa-solid fa-cart-plus"></i>
                      Thêm Vào Giỏ
                    </button>
                    <button
                      onClick={() => {
                        handleAddToCart(detailProduct, detailQuantity);
                        setCheckoutStep(1);
                        setActiveModal('checkout');
                      }}
                      className="bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-3 rounded-2xl"
                    >
                      Mua Ngay ({formatMoney(detailProduct.price * detailQuantity)})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. GIỎ HÀNG PHÂN 2 NHÓM: MUA SẴN & ĐẶT TRƯỚC (OI-10, FR-MHTT-01) */}
            {activeModal === 'cart_sheet' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[90%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 uppercase">Giỏ Hàng Đặc Sản ({cart.length})</h3>
                      <p className="text-[10px] text-stone-500">Phân 2 nhóm: Mua sẵn & Đặt trước (OI-10)</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 space-y-2">
                      <i className="fa-solid fa-basket-shopping text-4xl text-stone-300"></i>
                      <p>Giỏ hàng chưa có sản phẩm nào.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* NHÓM 1: HÀNG MUA SẴN TRONG KHO */}
                      {readyCartItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 bg-stone-100 px-2 py-1 rounded-lg">
                            <i className="fa-solid fa-boxes-packing text-orange-600"></i>
                            <span>1. Hàng Mua Sẵn Trong Kho HTX ({readyCartItems.length})</span>
                          </div>
                          {readyCartItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2.5 p-2 rounded-2xl border border-stone-200 bg-white items-center">
                              <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h4>
                                <span className="text-[11px] text-[#EE4D2D] font-extrabold tabular-nums block">{formatMoney(item.product.price)}</span>
                                <span className="text-[9px] text-stone-500">{item.product.coopName}</span>
                              </div>
                              <button
                                onClick={() => setCart(prev => prev.filter(it => it.product.id !== item.product.id))}
                                className="p-1 text-stone-400 hover:text-rose-600"
                              >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* NHÓM 2: HÀNG ĐẶT TRƯỚC THEO MÙA VỤ */}
                      {preorderCartItems.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            <i className="fa-solid fa-wheat-awn text-emerald-700"></i>
                            <span>2. Hàng Đặt Trước Mùa Vụ Pre-order ({preorderCartItems.length}) - Cọc 30%</span>
                          </div>
                          {preorderCartItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2.5 p-2 rounded-2xl border border-emerald-200 bg-emerald-50/30 items-center">
                              <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-stone-900 truncate">{item.product.name}</h4>
                                <span className="text-[11px] text-[#EE4D2D] font-extrabold tabular-nums block">{formatMoney(item.product.price)}</span>
                                <span className="text-[9px] text-emerald-800 font-bold">Ngày giao dự kiến: {item.product.preorderHarvestDate}</span>
                              </div>
                              <button
                                onClick={() => setCart(prev => prev.filter(it => it.product.id !== item.product.id))}
                                className="p-1 text-stone-400 hover:text-rose-600"
                              >
                                <i className="fa-solid fa-trash-can text-xs"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* VOUCHER ROW IN CART */}
                      <div className="bg-red-50/70 border border-[#EE4D2D]/30 p-2.5 rounded-2xl space-y-1.5">
                        <div
                          onClick={() => setActiveModal('voucher_selector')}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-ticket text-[#EE4D2D]"></i>
                            <div>
                              <span className="text-xs font-bold text-stone-900">Mã Giảm Giá ({appliedVouchers.length} mã)</span>
                              <span className="text-[11px] text-[#EE4D2D] font-bold block">
                                {totalVoucherDiscount > 0 ? \`Tiết kiệm -\${formatMoney(totalVoucherDiscount)}\` : 'Chọn mã freeship & OCOP'}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-[#EE4D2D] font-bold">Thêm / Đổi &gt;</span>
                        </div>

                        {appliedVouchers.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-red-200/60">
                            {appliedVouchers.map(v => (
                              <span key={v.id} className="inline-flex items-center gap-1 text-[9px] font-bold bg-white text-[#EE4D2D] border border-red-200 px-1.5 py-0.5 rounded">
                                <span>{v.code} (-{Math.round(v.discountAmount / 1000)}k)</span>
                                <button onClick={() => handleRemoveSingleVoucher(v.id)} className="text-stone-400 hover:text-rose-600">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Total Box */}
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1">
                        <div className="flex justify-between text-stone-600">
                          <span>Tổng tiền hàng ({cart.reduce((s, it) => s + it.quantity, 0)} món):</span>
                          <strong className="tabular-nums">{formatMoney(cartSubtotal)}</strong>
                        </div>
                        {totalVoucherDiscount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Voucher giảm giá:</span>
                            <strong className="tabular-nums">-{formatMoney(totalVoucherDiscount)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                          <span>Tạm tính sau giảm giá:</span>
                          <span className="text-[#EE4D2D] tabular-nums font-black">{formatMoney(Math.max(0, cartSubtotal - totalVoucherDiscount))}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveModal('checkout');
                          setCheckoutStep(1);
                        }}
                        className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-3.5 rounded-2xl shadow-md"
                      >
                        Tiến Hành Đặt Hàng ({formatMoney(Math.max(0, cartSubtotal - totalVoucherDiscount))})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CHECKOUT MODAL 3 BƯỚC (BR-DAT-02, BR-DAT-09, BR-TT-01..08) */}
            {activeModal === 'checkout' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[94%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  {/* Checkout Header & Steps */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        {checkoutStep === 1 ? '1. Địa Chỉ Giao Hàng Hà Nội' : checkoutStep === 2 ? '2. Hộp Quà & Thanh Toán' : '3. Xác Nhận & Tách Đơn HTX'}
                      </h3>
                      <p className="text-[10px] text-stone-500">Giữ đơn trong {formatPaymentTimer()} (PAR-19, BR-TT-03)</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  {/* BƯỚC 1: ĐỊA CHỈ & TUYẾN GIAO */}
                  {checkoutStep === 1 && (
                    <div className="space-y-3">
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold text-stone-900">
                          <span>Địa Chỉ Nhận Hàng (Chỉ giao Hà Nội - BR-DAT-04):</span>
                          <button onClick={() => setActiveModal('address_sheet')} className="text-[#EE4D2D] text-[11px]">Đổi</button>
                        </div>
                        <p className="text-stone-800 font-bold">{selectedAddress.title}</p>
                        <p className="text-stone-500 text-[11px]">
                          {selectedAddress.buildingBlock || selectedAddress.streetDetails}, {selectedAddress.ward}, {selectedAddress.district}, Hà Nội
                        </p>
                      </div>

                      {/* Tuyến xe */}
                      <div className="space-y-2 text-xs">
                        <span className="font-bold text-stone-800">Phương Thức Vận Chuyển:</span>
                        <div
                          onClick={() => setShippingType('express')}
                          className={\`p-3 rounded-2xl border cursor-pointer \${shippingType === 'express' ? 'border-[#EE4D2D] bg-red-50/50' : 'border-stone-200'}\`}
                        >
                          <div className="flex justify-between font-bold text-stone-900">
                            <span>Tuyến Hỏa Tốc CT05 Xe Lạnh (Bảo ôn đá gel -18°C)</span>
                            <span className="tabular-nums">45.000đ</span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1">Giao trong ngày về Hà Nội. Bắt buộc cho hàng tươi sống và Preorder.</p>
                        </div>

                        <div
                          onClick={() => {
                            if (hasFreshOrPreorderInCart) {
                              showToast('Giỏ hàng có hàng tươi / theo mùa, bắt buộc chọn xe lạnh CT05!');
                              return;
                            }
                            setShippingType('standard');
                          }}
                          className={\`p-3 rounded-2xl border cursor-pointer \${
                            hasFreshOrPreorderInCart ? 'opacity-50 bg-stone-100' : (shippingType === 'standard' ? 'border-[#EE4D2D] bg-red-50/50' : 'border-stone-200')
                          }\`}
                        >
                          <div className="flex justify-between font-bold text-stone-900">
                            <span>Chuyển phát tiêu chuẩn (Chỉ hàng khô)</span>
                            <span className="tabular-nums">28.000đ</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setCheckoutStep(2)}
                        className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-3.5 rounded-2xl shadow-md"
                      >
                        Tiếp Tục: Hộp Quà & Thanh Toán ➔
                      </button>
                    </div>
                  )}

                  {/* BƯỚC 2: HỘP QUÀ, LỜI NHẮN & PHƯƠNG THỨC THANH TOÁN (BR-DAT-09) */}
                  {checkoutStep === 2 && (
                    <div className="space-y-3">
                      {/* Chọn Hộp Quà (BR-DAT-09) */}
                      <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-950">
                          <span>Đóng Gói Hộp Quà Cao Cấp (BR-DAT-09):</span>
                          <span className="text-[10px] text-amber-800 font-normal">Tùy chọn</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedGiftOption(prev => prev === 'GIFT-01' ? null : 'GIFT-01')}
                            className={\`p-2 rounded-xl border text-left text-[11px] \${selectedGiftOption === 'GIFT-01' ? 'border-[#EE4D2D] bg-white font-bold' : 'border-stone-200 bg-stone-50'}\`}
                          >
                            <strong>Hộp Giấy Craft Eco</strong> (+40k)
                          </button>
                          <button
                            onClick={() => setSelectedGiftOption(prev => prev === 'GIFT-02' ? null : 'GIFT-02')}
                            className={\`p-2 rounded-xl border text-left text-[11px] \${selectedGiftOption === 'GIFT-02' ? 'border-[#EE4D2D] bg-white font-bold' : 'border-stone-200 bg-stone-50'}\`}
                          >
                            <strong>Hộp Gỗ Thông Thổ Cẩm</strong> (+40k)
                          </button>
                        </div>

                        {/* Nhập Lời Nhắn Thiệp (Chặn link & SĐT theo BR-DAT-09) */}
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] text-stone-700 font-semibold">Lời nhắn gửi người nhận (Tối đa 150 ký tự):</span>
                          <input
                            type="text"
                            maxLength={150}
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value)}
                            placeholder="VD: Chúc mừng tân gia! Thưởng thức chút cốm non Tú Lệ..."
                            className="w-full bg-white border border-stone-200 p-2 rounded-xl text-xs focus:outline-none focus:border-[#EE4D2D]"
                          />
                        </div>

                        {/* Tùy chọn Gửi Tặng Người Khác (BR-DAT-09, BR-QL-08) */}
                        <label className="flex items-center gap-2 pt-1 text-[11px] text-stone-800 cursor-pointer font-semibold">
                          <input
                            type="checkbox"
                            checked={isGiftForOther}
                            onChange={(e) => {
                              setIsGiftForOther(e.target.checked);
                              if (e.target.checked) setPaymentMethod('vietqr');
                            }}
                            className="rounded text-[#EE4D2D]"
                          />
                          <span>Gửi tặng người khác (Phiếu giao hàng ẩn giá tiền, chỉ trả online)</span>
                        </label>
                      </div>

                      {/* Phương thức thanh toán */}
                      <div className="space-y-1.5 text-xs">
                        <span className="font-bold text-stone-800">Phương Thức Thanh Toán:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setPaymentMethod('vietqr')}
                            className={\`p-2.5 rounded-2xl border text-left \${paymentMethod === 'vietqr' ? 'border-[#EE4D2D] bg-red-50 text-[#EE4D2D] font-bold' : 'border-stone-200'}\`}
                          >
                            <i className="fa-solid fa-qrcode mr-1"></i> VietQR Dynamic
                          </button>
                          <button
                            onClick={() => {
                              if (isGiftForOther) {
                                showToast('Đơn quà tặng gửi người khác bắt buộc thanh toán online (BR-DAT-09)!');
                                return;
                              }
                              setPaymentMethod('cod');
                            }}
                            className={\`p-2.5 rounded-2xl border text-left \${isGiftForOther ? 'opacity-40' : ''} \${paymentMethod === 'cod' ? 'border-[#EE4D2D] bg-red-50 text-[#EE4D2D] font-bold' : 'border-stone-200'}\`}
                          >
                            <i className="fa-solid fa-money-bill mr-1"></i> Thu COD Khi Nhận
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setCheckoutStep(1)} className="w-1/3 bg-stone-100 text-stone-700 text-xs font-bold py-3.5 rounded-2xl">
                          Quay lại
                        </button>
                        <button onClick={() => setCheckoutStep(3)} className="w-2/3 bg-[#EE4D2D] text-white text-xs font-bold py-3.5 rounded-2xl shadow-md">
                          Kiểm Tra Chi Phí ➔
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BƯỚC 3: XÁC NHẬN, TÁCH ĐƠN & BẢN CHỐT (BR-DAT-02, BR-DAT-06) */}
                  {checkoutStep === 3 && (
                    <div className="space-y-3 text-xs">
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1.5">
                        <div className="flex justify-between items-center font-bold text-stone-900 border-b pb-1">
                          <span>Bản Chốt Đơn Hàng (Snapshot BR-DAT-06)</span>
                          <span className="text-[#EE4D2D] font-mono">Giữ 15p: {formatPaymentTimer()}</span>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>Tổng tiền hàng ({cart.reduce((s, it) => s + it.quantity, 0)} món):</span>
                          <strong className="tabular-nums">{formatMoney(cartSubtotal)}</strong>
                        </div>
                        <div className="flex justify-between text-stone-600">
                          <span>Phí vận chuyển tuyến CT05:</span>
                          <strong className="tabular-nums">{formatMoney(shippingFee)}</strong>
                        </div>
                        {giftPackagingFee > 0 && (
                          <div className="flex justify-between text-stone-600">
                            <span>Phí đóng hộp quà Craft:</span>
                            <strong className="tabular-nums">+{formatMoney(giftPackagingFee)}</strong>
                          </div>
                        )}
                        {totalVoucherDiscount > 0 && (
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Giảm giá ({appliedVouchers.length} voucher):</span>
                            <strong className="tabular-nums">-{formatMoney(totalVoucherDiscount)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-stone-900 pt-1 border-t text-sm">
                          <span>Tổng giá trị đơn hàng:</span>
                          <span className="text-[#EE4D2D] tabular-nums">{formatMoney(totalOrderAmount)}</span>
                        </div>
                      </div>

                      {/* Phân tách 2 đợt thanh toán minh bạch */}
                      <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                        <strong className="block text-[#EE4D2D]">Phân Tách Thanh Toán 2 Đợt (BR-TIEN-02):</strong>
                        <div className="flex justify-between text-[11px] pt-1">
                          <span>• Đợt 1 (Cọc 30% Online qua VietQR):</span>
                          <strong className="text-[#EE4D2D] tabular-nums">{formatMoney(depositAmount)}</strong>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>• Đợt 2 (70% COD khi nhận tại Vinhomes Smart City):</span>
                          <strong className="tabular-nums">{formatMoney(remainingCodAmount)}</strong>
                        </div>
                      </div>

                      {/* Thông báo tách đơn theo HTX */}
                      <p className="text-[10px] text-stone-500 italic text-center">
                        * Hệ thống tự động tách thành {[...new Set(cart.map(it => it.product.coopId))].length} đơn hàng độc lập theo từng HTX phụ trách (BR-DAT-02).
                      </p>

                      <button
                        onClick={handlePlaceOrder}
                        className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold py-3.5 rounded-2xl shadow-md"
                      >
                        Xác Nhận Đặt Hàng ({formatMoney(totalOrderAmount)})
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* 4. THEO DÕI ĐƠN HÀNG CHI TIẾT MODAL (ORDER DETAIL TRACKING) */}
            {activeModal === 'order_detail_tracking' && selectedTrackingOrder && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[92%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 font-mono">Đơn #{selectedTrackingOrder.id}</h3>
                      <p className="text-[10px] text-stone-500">{selectedTrackingOrder.createdAt} • {selectedTrackingOrder.coopName}</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  {/* Trạng thái 11 bước */}
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span>Trạng Thái Hiện Tại:</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ORDER_STATUS_LABELS[selectedTrackingOrder.status]?.label || selectedTrackingOrder.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500">Tình trạng thanh toán: <strong>{selectedTrackingOrder.paymentStatus}</strong></div>
                    <div className="text-[11px] text-stone-500">Nhiệt độ xe lạnh: <strong className="text-emerald-700 font-mono">{selectedTrackingOrder.currentTemp}</strong></div>
                  </div>

                  {/* Lộ trình di chuyển */}
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 text-xs space-y-2">
                    <strong className="text-stone-800 block text-[11px] uppercase">Lộ Trình Giao Hàng Tuyến CT05:</strong>
                    <div className="space-y-2 pl-2 border-l-2 border-emerald-600 text-[11px] text-stone-600">
                      <div>• 05:00: Thu hái mẻ nếp tan ngậm sương tại bản La Pán Tẩn</div>
                      <div>• 09:30: HTX đóng bảo ôn 2 tảng đá gel -18°C, dán tem mã QR</div>
                      <div>• 11:00: Xe chuyên tuyến CT05 xuất phát về Hà Nội</div>
                      <div>• Hiện tại: Đang chuyển về Hub Tây Mỗ (Vinhomes Smart City)</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedTrackingOrder.status === 'dang_giao' && (
                      <button
                        onClick={() => {
                          handleCustomerConfirmReceived(selectedTrackingOrder.id);
                          setActiveModal(null);
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl col-span-2"
                      >
                        Xác Nhận Đã Nhận Hàng (FR-DH-15)
                      </button>
                    )}

                    {selectedTrackingOrder.status === 'da_giao' && (
                      <button
                        onClick={() => {
                          setActiveModal('support_claim');
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl col-span-2"
                      >
                        Gửi Khiếu Nại Bồi Hoàn 100%
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. KHIẾU NẠI & BỒI HOÀN MODAL (SUPPORT CLAIM - BR-HOAN-01..06) */}
            {activeModal === 'support_claim' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[92%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Khiếu Nại & Bồi Hoàn 100% (SLA 60p)</h3>
                      <p className="text-[10px] text-stone-500">Áp dụng đơn hàng dập nát hoặc đứt gãy chuỗi lạnh đá gel</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-stone-800">Chọn lý do khiếu nại (BR-HOAN-02):</span>
                    <div className="space-y-1">
                      {[
                        { id: 'broken_cold_chain', label: 'Đứt gãy chuỗi lạnh đá gel (Nhiệt độ >15°C) - Gắn cờ Khẩn cấp' },
                        { id: 'damaged_30', label: 'Hàng dập nát, biến chất trên 30%' },
                        { id: 'missing_wrong', label: 'Thiếu hàng hoặc sai chủng loại sản phẩm' }
                      ].map(item => (
                        <label key={item.id} className="flex items-center gap-2 p-2 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                          <input
                            type="radio"
                            name="claimIssue"
                            checked={claimIssue === item.id}
                            onChange={() => setClaimIssue(item.id)}
                            className="text-[#EE4D2D]"
                          />
                          <span className="text-[11px] font-medium">{item.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="pt-1 space-y-1">
                      <span className="font-bold text-stone-800">Tài khoản nhận tiền hoàn (Đơn COD - BR-HOAN-05):</span>
                      <input
                        type="text"
                        value={claimCustomerBank}
                        onChange={(e) => setClaimCustomerBank(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 p-2 rounded-xl text-xs"
                      />
                    </div>

                    <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-200 text-[10px] text-amber-900">
                      • Bắt buộc đính kèm ảnh chụp tem QR mã lô và ảnh thực tế sản phẩm hư hại.<br />
                      • Admin CSKH phân định trách nhiệm ≤ 24h làm việc (SOP).
                    </div>

                    <button
                      onClick={handleSubmitClaimTicket}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-2xl shadow-md text-xs mt-2"
                    >
                      Gửi Yêu Cầu Bồi Hoàn 100%
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ĐÁNH GIÁ SẢN PHẨM MODAL (REVIEW MODAL - BR-DG-01..07) */}
            {activeModal === 'review_modal' && reviewOrder && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[90%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Đánh Giá Sản Phẩm Đã Giao</h3>
                      <p className="text-[10px] text-stone-500">Đơn #{reviewOrder.id} • Nhãn "Đã mua hàng"</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  {/* Rating Stars (1-5) */}
                  <div className="text-center py-2 space-y-1">
                    <div className="flex justify-center gap-2 text-2xl text-amber-400 cursor-pointer">
                      {[1, 2, 3, 4, 5].map(star => (
                        <i
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className={\`fa-\${reviewRating >= star ? 'solid' : 'regular'} fa-star\`}
                        ></i>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-stone-700">
                      {reviewRating === 5 ? 'Tuyệt vời, đặc sản chuẩn vị!' : reviewRating === 4 ? 'Hài lòng, giao nhanh' : reviewRating === 3 ? 'Bình thường' : 'Chưa hài lòng (Bắt buộc nhận xét ≥20 ký tự)'}
                    </span>
                  </div>

                  {/* Comment Box with length validator (BR-DG-02) */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-stone-700">Nhận xét chi tiết:</span>
                      <span className={\`font-mono font-bold \${reviewRating <= 2 && reviewComment.trim().length < 20 ? 'text-rose-600' : 'text-stone-400'}\`}>
                        {reviewComment.trim().length}/20 ký tự tối thiểu
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Chia sẻ hương vị, độ tươi ngon và chất lượng đóng gói bảo ôn đá gel..."
                      className="w-full bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-xs focus:outline-none focus:border-[#EE4D2D]"
                    ></textarea>
                    {reviewRating <= 2 && reviewComment.trim().length < 20 && (
                      <p className="text-[10px] text-rose-600 font-bold">
                        ⚠️ Quy định BR-DG-02: Đánh giá 1-2 sao bắt buộc nhập nhận xét từ 20 ký tự để hỗ trợ HTX cải thiện chất lượng.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    className="w-full bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold py-3 rounded-2xl text-xs shadow-md"
                  >
                    Gửi Đánh Giá Sản Phẩm
                  </button>
                </div>
              </div>
            )}

            {/* 7. VOUCHER SELECTOR MODAL (MULTI-VOUCHER) */}
            {activeModal === 'voucher_selector' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[94%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <i className="fa-solid fa-ticket text-[#EE4D2D]"></i>
                        <h3 className="text-sm font-bold text-stone-900">Kho Voucher & Mã Giảm Giá Đặc Sản</h3>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Đặc quyền: <strong>Cho phép chọn gộp nhiều mã cùng lúc</strong> (Freeship + OCOP + Mùa vụ)
                      </p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400 hover:text-stone-700">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  {/* Summary card */}
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                        <i className="fa-solid fa-circle-check text-emerald-700 text-sm"></i>
                        <span>Đang chọn <strong className="text-emerald-800">{selectedVoucherIds.length} mã</strong> giảm giá</span>
                      </div>
                      <strong className="text-[#EE4D2D] text-sm tabular-nums font-black">
                        -{formatMoney(totalVoucherDiscount)}
                      </strong>
                    </div>

                    {appliedVouchers.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap gap-1">
                        {appliedVouchers.map(v => (
                          <span key={v.id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-lg">
                            <span>{v.code} (-{Math.round(v.discountAmount / 1000)}k)</span>
                            <button onClick={() => handleRemoveSingleVoucher(v.id)} className="text-stone-400 hover:text-rose-600">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button onClick={handleSelectBestVouchers} className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold py-2 rounded-xl flex items-center justify-center gap-1">
                      <i className="fa-solid fa-bolt text-amber-600 text-xs"></i>
                      <span>Tối ưu giảm sâu</span>
                    </button>
                    <button onClick={handleSelectAllEligibleVouchers} className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold py-2 rounded-xl flex items-center justify-center gap-1">
                      <i className="fa-solid fa-check-double text-emerald-700 text-xs"></i>
                      <span>Chọn hết mã đủ ĐK</span>
                    </button>
                    <button onClick={handleClearAllVouchers} className="bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold py-2 rounded-xl flex items-center justify-center gap-1">
                      <i className="fa-solid fa-rotate-left text-stone-500 text-xs"></i>
                      <span>Bỏ chọn tất cả</span>
                    </button>
                  </div>

                  {/* Vouchers list */}
                  <div className="space-y-2.5">
                    {AVAILABLE_VOUCHERS.map(v => {
                      const isSelected = selectedVoucherIds.includes(v.id);
                      const isEligible = cartSubtotal >= v.minSpend;
                      return (
                        <div
                          key={v.id}
                          onClick={() => toggleVoucher(v)}
                          className={\`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center \${
                            isSelected ? 'border-[#EE4D2D] bg-red-50/40 ring-1 ring-[#EE4D2D]/30' : 'border-stone-200 bg-white hover:border-stone-300'
                          }\`}
                        >
                          <div className={\`w-14 h-16 rounded-xl flex flex-col items-center justify-center p-1 border text-center shrink-0 \${v.colorBadge}\`}>
                            <span className="text-xs font-black tabular-nums">-{Math.round(v.discountAmount / 1000)}k</span>
                            <span className="text-[8px] font-bold uppercase">{v.category}</span>
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="bg-stone-900 text-white text-[9px] font-mono font-bold px-1 rounded">{v.code}</span>
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">✓ Cộng dồn</span>
                            </div>
                            <h4 className="font-bold text-stone-900 mt-0.5 line-clamp-1">{v.title}</h4>
                            <p className="text-[10px] text-stone-500">{v.sub}</p>
                            <span className="text-[9px] text-stone-400">{v.expiry} • Đơn từ {formatMoney(v.minSpend)}</span>
                          </div>
                          <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center \${isSelected ? 'bg-[#EE4D2D] border-[#EE4D2D] text-white' : 'border-stone-300 text-transparent'}\`}>
                            <i className="fa-solid fa-check text-[10px]"></i>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 sticky bottom-0 bg-white border-t border-stone-100">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="w-full bg-[#EE4D2D] text-white text-xs font-bold py-3.5 rounded-2xl shadow-md"
                    >
                      Xác Nhận Dùng {selectedVoucherIds.length} Mã ({formatMoney(totalVoucherDiscount)})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 8. SỔ ĐỊA CHỈ HÀ NỘI & VINHOMES SMART CITY MODAL */}
            {activeModal === 'address_sheet' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[85%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Sổ Địa Chỉ Giao Hàng Hà Nội</h3>
                      <p className="text-[10px] text-stone-500">Chung cư bắt buộc Tòa - Căn (BR-DAT-04)</p>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {addresses.map(a => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedAddress(a);
                          setActiveModal(null);
                          showToast(\`Đã chọn: \${a.title}\`);
                        }}
                        className={\`p-3 rounded-2xl border cursor-pointer \${
                          selectedAddress.id === a.id ? 'border-[#EE4D2D] bg-red-50/40 font-bold' : 'border-stone-200 bg-white'
                        }\`}
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-900 font-bold">{a.title}</span>
                          {selectedAddress.id === a.id && <span className="text-[#EE4D2D] text-[10px]">Đang chọn ✓</span>}
                        </div>
                        <p className="text-[11px] text-stone-600 mt-1">
                          {a.buildingBlock ? \`\${a.buildingBlock}, \` : ''}{a.streetDetails ? \`\${a.streetDetails}, \` : ''}{a.ward}, {a.district}, {a.city}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 9. GS1 / EPCIS TRACEABILITY LOT MODAL */}
            {activeModal === 'trace_lot' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[92%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-sky-700 uppercase">Hồ Sơ Nguồn Gốc EPCIS</span>
                      <h3 className="text-sm font-bold text-stone-900">Mã Lô: LOT-YB-TL-260923</h3>
                    </div>
                    <button onClick={() => setActiveModal(null)} className="p-1 text-stone-400">
                      <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                  </div>

                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-xs space-y-1.5">
                    <div>• <strong>Nông hộ:</strong> Lù A Sáng (Dân tộc Mông, Bản La Pán Tẩn)</div>
                    <div>• <strong>Tọa độ GPS:</strong> 21.85°N, 104.08°E (Độ cao 1.250m)</div>
                    <div>• <strong>Chứng nhận:</strong> OCOP 5 Sao (QĐ số 142/QĐ-UBND)</div>
                    <div>• <strong>Quy chuẩn đóng gói:</strong> Hút chân không PA + ướp đá gel -18°C</div>
                  </div>

                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full bg-sky-800 text-white text-xs font-bold py-3 rounded-2xl"
                  >
                    Đóng Xem Hồ Sơ
                  </button>
                </div>
              </div>
            )}

            {/* 10. SHIPPER SCAN MOCK MODAL */}
            {activeModal === 'shipper_scan' && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex flex-col justify-end">
                <div className="bg-white rounded-t-[36px] max-h-[85%] overflow-y-auto no-scrollbar p-4 space-y-3.5 shadow-2xl text-center">
                  <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto"></div>
                  <h3 className="text-sm font-bold text-stone-900">Quét Mã QR Kiện Hàng Tại Hub Tây Mỗ</h3>
                  
                  <div className="relative w-44 h-44 mx-auto border-2 border-dashed border-sky-600 rounded-3xl flex items-center justify-center bg-stone-50">
                    <i className="fa-solid fa-qrcode text-6xl text-sky-700"></i>
                    <div className="absolute inset-x-0 h-1 bg-sky-500 animate-scanline"></div>
                  </div>

                  <p className="text-xs text-stone-600">Đang quét kiện hàng ORD-2609-8892 giao Tòa S2.03</p>

                  <button
                    onClick={() => {
                      setActiveModal(null);
                      showToast('Quét mã thành công! Kiện hàng đã chuyển sang trạng thái Đang giao.');
                    }}
                    className="w-full bg-sky-700 text-white text-xs font-bold py-3 rounded-2xl"
                  >
                    Xác Nhận Nhận Kiện Hàng
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;

fs.writeFileSync('index.html', htmlContent);
console.log('Successfully generated index.html. Total bytes:', htmlContent.length);
