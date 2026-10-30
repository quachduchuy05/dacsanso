import { Phone } from 'lucide-react';
import { formatContactPhone, isSamplePhone } from '../store/commands/coopContact';

/** 2 nút gọi SĐT của HTX cho Admin: bấm là mở ứng dụng gọi của máy (`tel:`). Không dùng ở màn của khách. */
export function CoopCallLinks({ name, phones }: { name: string; phones: string[] }) {
  if (phones.length === 0) return <p className="text-sm text-muted">HTX chưa cập nhật số điện thoại.</p>;
  return (
    <div className="space-y-1.5">
      <ul className="grid gap-2 min-[400px]:grid-cols-2">
        {phones.map((p, i) => (
          <li key={p}>
            <a
              href={`tel:${p}`}
              aria-label={`Gọi ${name}, số ${i + 1}: ${formatContactPhone(p)}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-forest-800 bg-white px-3 text-sm font-bold text-forest-900 hover:bg-forest-50"
            >
              <Phone size={16} aria-hidden="true" />
              <span className="tabular-nums">{formatContactPhone(p)}</span>
            </a>
          </li>
        ))}
      </ul>
      {phones.every(isSamplePhone) && <p className="text-xs text-muted">Bản demo: số điện thoại mẫu.</p>}
    </div>
  );
}
