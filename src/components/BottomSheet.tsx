/**
 * Bottom sheet dùng chung cho mọi màn: đóng bằng nút X, bấm nền tối hoặc phím Esc.
 * Trên điện thoại trượt từ đáy; từ md trở lên hiện giữa màn hình.
 * `wide`: sheet nhiều nội dung (chi tiết sản phẩm, chi tiết đơn) rộng hơn trên máy tính để chia 2 cột (xem SheetColumns).
 */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { DemoBand } from './DemoBand';

interface BottomSheetProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Nội dung cố định ở đáy sheet (nút hành động chính). */
  footer?: ReactNode;
  closeLabel?: string;
  wide?: boolean;
  className?: string;
  swipeToClose?: boolean;
}

export function BottomSheet({ title, onClose, children, footer, closeLabel = 'Đóng', wide = false, className = '', swipeToClose = false }: BottomSheetProps) {
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const gesture = useRef<{x:number;y:number;distance:number}|null>(null);
  const resetDrag = () => { gesture.current=null;sheet.current?.style.removeProperty('transform'); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="app-sheet-overlay fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/60 md:justify-center md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <DemoBand className="pointer-events-none absolute inset-x-0 top-0" />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`app-sheet relative flex min-h-0 min-w-0 w-full max-w-[640px] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl md:rounded-[32px] ${wide ? 'lg:max-w-5xl xl:max-w-6xl' : ''} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Viền vàng mảnh và hoa văn ở mép trên của sheet. */}
        <div aria-hidden="true" className="brocade-light h-2 shrink-0 opacity-80" />
        <div className={`app-sheet-header relative flex shrink-0 items-start justify-between gap-3 border-b border-champagne-200/70 px-5 pt-2 pb-2 ${swipeToClose?'sheet-swipe-header':''}`}
          style={swipeToClose?{touchAction:'pan-x pinch-zoom'}:undefined}
          onPointerDown={event=>{if(!swipeToClose||event.pointerType!=='touch'||!matchMedia('(max-width: 767px)').matches||(event.target as HTMLElement).closest('button,input,a,select,textarea'))return;gesture.current={x:event.clientX,y:event.clientY,distance:0};event.currentTarget.setPointerCapture(event.pointerId);}}
          onPointerMove={event=>{const g=gesture.current;if(!g)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)){resetDrag();return;}g.distance=Math.max(0,dy);if(sheet.current)sheet.current.style.transform=`translateY(${Math.min(g.distance,240)}px)`;}}
          onPointerUp={()=>{const close=(gesture.current?.distance??0)>=85;resetDrag();if(close)onClose();}}
          onPointerCancel={resetDrag}
          onLostPointerCapture={resetDrag}
        >
          {swipeToClose&&<span className="sheet-drag-handle md:hidden" aria-hidden="true"/>}
          <div id={titleId} className="app-sheet-title min-w-0 flex-1 pt-2 font-display text-xl font-semibold leading-snug text-ink">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-stone-100 hover:text-stone-800"
          >
            <X size={20} />
          </button>
        </div>
        <div className="app-sheet-body min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pt-3 pb-5">{children}</div>
        {footer && (
          <div className="app-sheet-footer shrink-0 border-t border-champagne-200/70 bg-champagne-50/60 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Hai cột trong sheet rộng trên máy tính; điện thoại vẫn một cột theo đúng thứ tự cũ.
 * Cột trái là phần đầu, cột phải là phần sau của nội dung, nên thứ tự đọc (và thứ tự Tab) không đổi.
 */
export function SheetColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      <div className="min-w-0 space-y-4">{left}</div>
      <div className="min-w-0 space-y-4">{right}</div>
    </div>
  );
}
