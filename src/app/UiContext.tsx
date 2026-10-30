/**
 * Trạng thái giao diện: tài khoản đang đăng nhập (theo từng tab), tab khách hàng, sheet đang mở, thông báo nổi.
 * Vai trò, HTX và nhóm quyền Admin lấy từ tài khoản đăng nhập (mục 5.9); không có thanh chuyển vai trò công khai.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { actorOf } from '../domain/auth';
import type { OrderTabKey } from '../store/commands/orderTabs';
import type { Actor, AdminSubGroup, CartLine, UserAccount } from '../domain/types';
import { useStore } from '../store/AppDataContext';
import { loadSession, saveSession } from '../store/persistence';
import { backendLogout, hasBackendSession } from '../store/backend';

/** Thanh dưới của khách. Đơn mua nằm trong Tài khoản (chủ repo yêu cầu gộp, không còn tab Đơn hàng riêng). */
export type CustomerTab = 'explore' | 'season' | 'account';

/** Đặt từ giỏ: `productIds` là các sản phẩm khách đã chọn trong giỏ (không có thì lấy cả giỏ). */
export type CheckoutSource = { type: 'cart'; productIds?: string[] } | { type: 'buy_now'; line: CartLine };

export type ModalState =
  | { type: 'product_detail'; productId: string }
  | { type: 'trace_lot'; productId: string;lotId?:string }
  | { type: 'cart' }
  /** `addressId`: địa chỉ chọn sẵn, vd. địa chỉ vừa thêm từ bước đặt hàng. */
  | { type: 'checkout'; source: CheckoutSource; addressId?: string }
  | { type: 'payment'; txId: string }
  | { type: 'order_detail'; orderId: string }
  | { type: 'address_book' }
  /** `returnTo`: màn mở lại sau khi lưu hoặc đóng form (mặc định là sổ địa chỉ). */
  | { type: 'address_form'; addressId?: string; returnTo?: ModalState }
  | { type: 'complaint'; orderId?: string }
  /** Khiếu nại của khách, nhóm theo đơn. */
  | { type: 'complaints' }
  | { type: 'coop_order'; orderId: string }
  /** Shipper xem đơn được giao, lấy hàng, báo kết quả giao. */
  | { type: 'shipper_order'; orderId: string }
  /** HTX xác nhận thu hoạch cả lô cho một sản phẩm đặt trước. `returnTo`: mở lại khi đóng (vd. đơn đang xem). */
  | { type: 'coop_harvest'; productId: string; returnTo?: ModalState }
  | { type: 'notifications' }
  /** Tin nhắn với HTX (khách) / với khách (HTX). `withId`: mở sẵn cuộc trò chuyện với bên này; `productId`: khách hỏi về sản phẩm. */
  | { type: 'chat'; withId?: string; productId?: string }
  | { type: 'review'; orderId: string; productId: string }
  | { type: 'coop_product_form'; productId?: string }
  /** HTX thêm quy cách (hộp 500 g…) cho sản phẩm. */
  | { type: 'coop_variant_form'; productId: string }
  /** HTX nộp hồ sơ đăng ký (màn đăng nhập); `applicationId`: bổ sung hồ sơ Admin yêu cầu. */
  | { type: 'coop_apply'; applicationId?: string }
  /** HTX tra cứu hồ sơ đăng ký; `phone`: tra sẵn số này (vừa nộp xong). */
  | { type: 'coop_apply_status'; phone?: string }
  | { type: 'demo_panel' }
  /** Trang shop công khai của HTX: sản phẩm đang bán, đánh giá, theo dõi (không có SĐT, địa chỉ). */
  | { type: 'coop_shop'; coopId: string }
  /** Sản phẩm yêu thích và HTX đang theo dõi của khách. */
  | { type: 'favorites' }
  /** Kho voucher: mã khách đã lưu và mã đang phát hành. */
  | { type: 'voucher_wallet' }
  /** Sản phẩm đặt trước khách theo dõi "Báo tôi khi vào mùa". */
  | { type: 'season_watch' }
  /** Thông tin xuất hoá đơn công ty mặc định của khách (mô phỏng). */
  | { type: 'invoice_default' };

const NO_ACTOR: Actor = { kind: 'system', name: 'Chưa đăng nhập' };

interface UiContextValue {
  /** Tài khoản đang đăng nhập ở tab này; null khi chưa đăng nhập. */
  user: UserAccount | null;
  login: (userId: string) => void;
  logout: () => void;
  /** Người đang thao tác (dùng cho mọi hàm domain). */
  actor: Actor;
  /** Bí danh của `actor` theo vai trò, để màn hình đọc rõ nghĩa. */
  customerActor: Actor;
  coopActor: Actor;
  adminActor: Actor;
  coopId: string;
  adminGroup: AdminSubGroup;
  customerTab: CustomerTab;
  setCustomerTab: (tab: CustomerTab) => void;
  /** Tab đang chọn trong "Đơn mua" của khách. */
  orderTab: OrderTabKey;
  setOrderTab: (tab: OrderTabKey) => void;
  /** Mở danh sách Đơn mua (trong Tài khoản) ở đúng tab và cuộn tới danh sách. */
  openOrders: (tab: OrderTabKey) => void;
  /** Tăng mỗi lần openOrders; kèm takeOrdersFocus() để Tài khoản biết cần cuộn tới danh sách đơn. */
  ordersFocus: number;
  takeOrdersFocus: () => boolean;
  modal: ModalState | null;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  toast: string | null;
  showToast: (message: string) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const [userId, setUserId] = useState<string | null>(() => hasBackendSession() ? loadSession() : null);
  useEffect(() => { const clear = () => { saveSession(null); setUserId(null); setModal(null); }; window.addEventListener('backend-logout', clear); return () => window.removeEventListener('backend-logout', clear); }, []);
  const [customerTab, setCustomerTab] = useState<CustomerTab>('explore');
  const [orderTab, setOrderTab] = useState<OrderTabKey>('all');
  const [ordersFocus, setOrdersFocus] = useState(0);
  const pendingOrdersFocus = useRef(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const user = state.users.find((u) => u.id === userId && u.status === 'active') ?? null;

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const login = useCallback((id: string) => {
    saveSession(id);
    setUserId(id);
    setModal(null);
    setCustomerTab('explore');
    setOrderTab('all');
  }, []);
  const openOrders = useCallback((tab: OrderTabKey) => {
    setOrderTab(tab);
    setCustomerTab('account');
    pendingOrdersFocus.current = true;
    setOrdersFocus((n) => n + 1);
  }, []);
  const takeOrdersFocus = useCallback(() => {
    const pending = pendingOrdersFocus.current;
    pendingOrdersFocus.current = false;
    return pending;
  }, []);
  const logout = useCallback(async () => {
    saveSession(null);
    setUserId(null);
    setModal(null);
    await backendLogout();
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const value = useMemo<UiContextValue>(() => {
    const actor = user ? actorOf(user) : NO_ACTOR;
    return {
      user,
      login,
      logout,
      actor,
      customerActor: actor,
      coopActor: actor,
      adminActor: actor,
      coopId: user?.coopId ?? '',
      adminGroup: user?.adminGroup ?? 'operations',
      customerTab,
      setCustomerTab,
      orderTab,
      setOrderTab,
      openOrders,
      ordersFocus,
      takeOrdersFocus,
      modal,
      openModal: (next) => { if(!user&&['checkout','cart','favorites','voucher_wallet','season_watch','address_book','invoice_default','review','complaint'].includes(next.type)){showToast('Vui lòng đăng nhập để tiếp tục.');window.dispatchEvent(new Event('show-login'));return;}setModal(next); },
      closeModal,
      toast,
      showToast,
    };
  }, [user, login, logout, customerTab, orderTab, openOrders, ordersFocus, takeOrdersFocus, modal, closeModal, toast, showToast]);
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi phải dùng bên trong UiProvider');
  return ctx;
}
