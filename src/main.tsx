import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
// Phông có chân cho tiêu đề và tên sản phẩm (dáng hàng đặc sản thủ công); có bộ chữ tiếng Việt.
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/500-italic.css';
import App from './App';
import {lazy,Suspense} from 'react';
const ModelStudio=lazy(()=>import('./screens/customer/ModelStudio'));
import { AppCrashBoundary } from './app/AppCrashBoundary';
import { reloadOnceForNewVersion } from './app/chunkReload';
import './index.css';

// Vite báo không tải được mã của một màn (thường do vừa deploy bản mới): tải lại trang để lấy bản mới.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppCrashBoundary>
      {window.location.pathname==='/xem-mo-hinh-3d'?<Suspense fallback={<p role="status">Đang mở bộ sưu tập 3D…</p>}><ModelStudio/></Suspense>:<App />}
    </AppCrashBoundary>
  </StrictMode>,
);

import '@fontsource/newsreader/400.css';
import '@fontsource/newsreader/500.css';
import '@fontsource/newsreader/400-italic.css';

import './storefront.css';

import './auth.css';

import './catalog.css';
import './responsive.css';
import './signature.css';
import './admin.css';
import './phase2.css';
import './forest-commerce.css';
