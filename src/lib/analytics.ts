// Theo dõi điều hướng SPA cho Google Analytics 4 (gtag.js).
//
// HashRouter chỉ để GA4 tự bắn `page_view` đúng MỘT lần lúc tải trang; mọi lần đổi
// route sau đó (#/game/..., #/category/...) đều KHÔNG được ghi nhận. Tệ hơn, GA4 cắt
// bỏ phần fragment sau dấu `#`, nên nếu để mặc định thì mọi route gộp hết về
// `/lingo-land/` và ta mất sạch dữ liệu "người dùng hay vào URL nào".
//
// File này gửi `page_view` thủ công với một `page_location`/`page_path` "ảo" — thay
// hash bằng path thật (`/lingo-land/game/traffichero`) để GA4 báo cáo từng route như
// một trang riêng. Đồng thời cung cấp `trackEvent` cho các sự kiện hành vi tuỳ ý.
//
// gtag được nạp ở index.html qua googleTagPlugin trong vite.config.ts, và CHỈ khi
// VITE_GOOGLE_TAG có giá trị. Nếu không có (local/dev), `window.gtag` không tồn tại
// và mọi hàm ở đây là no-op an toàn — không cần guard ở phía gọi.

type GtagFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | null {
  const g = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof g === 'function' ? g : null;
}

// `/lingo-land` (BASE_URL bỏ dấu `/` cuối). Dùng để dựng path ảo khớp với cấu trúc
// site thật, để báo cáo GA4 đọc tự nhiên thay vì lồng hash.
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

// Dựng path ảo từ route của HashRouter: '/' → '/lingo-land/', '/game/x' →
// '/lingo-land/game/x'. Giữ nguyên query (?a=b) nếu có để phân tích sâu hơn.
function toVirtualPath(routePath: string, search = ''): string {
  const clean = routePath === '/' ? '/' : routePath;
  return `${BASE}${clean}${search}`;
}

/**
 * Gửi một `page_view` cho route hiện tại. Gọi mỗi lần `location` đổi.
 * @param routePath  pathname từ react-router (vd '/game/traffichero')
 * @param search     query string nếu có (vd '?level=2'), mặc định ''
 * @param title      tiêu đề trang; mặc định lấy document.title
 */
export function trackPageView(routePath: string, search = '', title?: string): void {
  const gtag = getGtag();
  if (!gtag) return;
  const path = toVirtualPath(routePath, search);
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.origin + path,
    page_title: title ?? document.title,
  });
}

/**
 * Gửi một sự kiện hành vi tuỳ ý (vd 'game_start', 'test_finish').
 * Dùng để phân tích hành vi vượt ngoài lượt xem trang.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag('event', name, params);
}
