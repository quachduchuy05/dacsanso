/**
 * Tranh phong cảnh vùng cao (núi xa, ruộng bậc thang, mặt trời lặn) cho đầu trang.
 * Đặt trong khung nền xanh rừng; phần tranh nằm ở nửa dưới để chữ phía trên luôn đọc rõ.
 */
export function LandscapeArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <circle cx="268" cy="150" r="24" fill="#C9A96E" />
      <path d="M0 176 L46 140 L84 158 L132 118 L178 150 L224 124 L268 148 L312 120 L360 142 L400 128 L400 240 L0 240 Z" fill="#2E6A50" />
      <path d="M0 196 L58 164 L106 182 L156 150 L214 178 L262 158 L318 176 L400 156 L400 240 L0 240 Z" fill="#255B44" />
      <path d="M0 212 Q100 190 200 204 T400 196 L400 240 L0 240 Z" fill="#1F4D3A" />
      <path d="M0 212 Q100 190 200 204 T400 196" fill="none" stroke="#C9A96E" strokeWidth="1" opacity="0.5" />
      <path d="M0 226 Q110 208 220 220 T400 214" fill="none" stroke="#C9A96E" strokeWidth="1" opacity="0.4" />
      <path d="M0 238 Q120 224 240 234 T400 230" fill="none" stroke="#C9A96E" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
