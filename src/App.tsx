/**
 * ĐẶC SẢN SỐ LÀO CAI – prototype.
 * Cấu trúc: src/domain (nghiệp vụ, hàm thuần) · src/data (dữ liệu mẫu) · src/store (localStorage)
 * · src/screens (màn theo vai trò) · src/components (thành phần dùng chung) · src/app (khung app).
 */
import { StorefrontProvider } from './app/StorefrontContext';
import { AppShell } from './app/AppShell';
import { UiProvider } from './app/UiContext';
import { AppDataProvider } from './store/AppDataContext';

export default function App() {
  return (
    <AppDataProvider>
      <UiProvider>
        <StorefrontProvider><AppShell /></StorefrontProvider>
      </UiProvider>
    </AppDataProvider>
  );
}
