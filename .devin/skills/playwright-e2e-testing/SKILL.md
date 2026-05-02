# Skill: Playwright E2E Testing — Vật Tư Nhà Thờ

## Mục đích
Hướng dẫn viết và chạy test e2e với Playwright cho dự án Node.js/Express/EJS này.
Dựa trên kinh nghiệm thực tế đã thực hiện: 98 tests (34 general + 64 mobile).

---

## Cấu trúc test

```
tests/e2e/
  app.spec.js       # Test chức năng: dashboard, CRUD, báo cáo, Excel, localStorage
  mobile.spec.js    # Test giao diện điện thoại: layout, overflow, tap targets, modal
playwright.config.js
```

---

## Chạy test

```bash
# Tất cả test
npx playwright test

# Chỉ mobile
npx playwright test tests/e2e/mobile.spec.js

# Chỉ app
npx playwright test tests/e2e/app.spec.js

# Xem báo cáo HTML
npx playwright show-report tests/playwright-report
```

> **Lưu ý**: Server phải đang chạy trên `http://localhost:3000` trước khi test.
> Chạy server: `npm run dev` hoặc `node app/server.js`

---

## playwright.config.js — cấu hình quan trọng

```js
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,      // Retry 1 lần để tránh flaky (server bị overload)
  workers: 1,      // LUÔN dùng 1 worker vì server local không chịu được parallel
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
});
```

---

## Patterns đã học — QUAN TRỌNG

### 1. Kiểm tra thành công sau submit form
Server redirect về `?success=created` / `?success=updated` / `?success=deleted`.
**ĐỪNG** dùng `.msg-success` vì nó tự ẩn sau 3 giây.

```js
// SAI — message tự ẩn sau 3s, Playwright không kịp check
await expect(page.locator('.msg-success')).toBeVisible();

// ĐÚNG — check URL query thay vì DOM
await Promise.all([
  page.waitForURL(/success=created/),
  page.locator('#entryForm button[type="submit"]').click(),
]);
await expect(page).toHaveURL(/success=created/);
```

### 2. Submit form — tránh strict mode violation
Trang nhập vật tư có 2 form: `#entryForm` và `.quick-add-form`. Phải chỉ định đúng:

```js
// SAI — resolve 2 elements
await page.locator('button[type="submit"]').click();

// ĐÚNG
await page.locator('#entryForm button[type="submit"]').click();
```

### 3. Modal có nhiều .modal-content trên cùng trang
Trang `/materials` có cả `#addModal` và `#editModal`. Dùng selector cụ thể:

```js
// SAI — strict mode violation
const box = await page.locator('.modal-content').boundingBox();

// ĐÚNG
const box = await page.locator('#addModal .modal-content').boundingBox();
const box = await page.locator('#editModal .modal-content').boundingBox();
```

### 4. Element trong scrollable container
`getBoundingClientRect().right` vượt viewport ngay cả khi element nằm trong
container có `overflow-x: auto`. Cần skip các element đó khi check overflow:

```js
function hasScrollableAncestor(el) {
  let p = el.parentElement;
  while (p && p !== document.body) {
    const ox = getComputedStyle(p).overflowX;
    if (ox === 'auto' || ox === 'scroll') return true;
    p = p.parentElement;
  }
  return false;
}

// Dùng khi check horizontal overflow
document.querySelectorAll('*').forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.right > vw + 2 && !hasScrollableAncestor(el)) {
    bad.push(el);
  }
});
```

### 5. Input `type="hidden"` trong selector
`:not([type="hidden"])` để lọc chỉ input có thể thấy:

```js
// SAI — bao gồm cả input[type="hidden"]
const inputs = page.locator('.quick-add-form input');

// ĐÚNG
const inputs = page.locator('.quick-add-form input:not([type="hidden"])');
```

### 6. Active link trong nav — tránh match nhầm
EJS: dùng `startsWith` hoặc so sánh `===` thay vì `includes` để tránh:
- `"Trang chủ - Quản lý vật tư nhà thờ".includes('vật tư')` → true (nhầm!)
- `"Báo cáo vật tư".includes('vật tư')` → true (nhầm!)

```ejs
<!-- SAI -->
class="<%= title?.includes('vật tư') ? 'active' : '' %>"

<!-- ĐÚNG -->
class="<%= title === 'Danh sách vật tư' ? 'active' : '' %>"
class="<%= title?.startsWith('Báo cáo') ? 'active' : '' %>"
```

### 7. Test cần dữ liệu — tự tạo trong beforeEach/test
Không giả định có dữ liệu sẵn. Tạo dữ liệu ngay trong test:

```js
test('Sửa phiếu nhập', async ({ page }) => {
  // Tạo phiếu trước
  await page.goto('/supplies/entry/xi_mang_sat_thep');
  await page.locator('#material_select').selectOption('custom');
  await page.locator('#custom_name').fill('Phiếu test sửa');
  // ... fill other fields
  await Promise.all([
    page.waitForURL(/success=created/),
    page.locator('#entryForm button[type="submit"]').click(),
  ]);

  // Rồi mới test sửa
  await page.goto('/supplies/history/xi_mang_sat_thep');
  // ...
});
```

### 8. `<details>` element — mở trước khi check nội dung
`boundingBox()` trả về `null` cho element bên trong `<details>` chưa mở:

```js
// Phải click summary trước
await page.locator('.quick-add-material summary').click();
await expect(page.locator('.quick-add-form')).toBeVisible();
// Sau đó mới lấy boundingBox
const box = await page.locator('.quick-add-form').boundingBox();
```

---

## Test mobile — viewport presets

```js
const VP = {
  iphone13:  { width: 390,  height: 844 },
  iphoneSE:  { width: 375,  height: 667 },
  android:   { width: 360,  height: 640 },
  small:     { width: 320,  height: 568 },
  landscape: { width: 844,  height: 390 },
  desktop:   { width: 1280, height: 800 },
};

async function gotoMobile(page, path, vp = VP.iphone13) {
  await page.setViewportSize(vp);
  await page.goto(`http://localhost:3000${path}`);
}
```

---

## Checklist test mobile toàn diện

Khi viết test mobile mới, đảm bảo cover:

- [ ] **Navigation**: bottom nav hiển thị, top nav ẩn; active link đúng
- [ ] **Không overflow ngang**: dùng `checkNoHorizontalOverflow()` (bỏ qua scrollable container)
- [ ] **Card layout**: `.desktop-table` ẩn, `.mobile-card-list` hiện (≤768px)
- [ ] **Input font-size ≥ 16px**: ngăn auto-zoom trên iOS Safari
- [ ] **Nút đủ lớn**: height ≥ 44px cho tất cả button/link tương tác
- [ ] **Modal = bottom sheet**: `border-radius: xl xl 0 0`, full width, modal-bottom align
- [ ] **Form layout**: 2 cột trên mobile (≥360px), 1 cột trên màn nhỏ (<400px)
- [ ] **Nhiều viewport**: iPhone 13, iPhone SE, Android (360px)
- [ ] **Landscape**: 844×390 → desktop breakpoint → bảng hiện, không overflow

---

## Lỗi CSS phát hiện qua test (đã sửa)

| Vấn đề | Nguyên nhân | Cách sửa |
|--------|-------------|----------|
| Form lọc báo cáo xếp 1 cột thay vì 2 | `form-row` có 4 item + `last-child: grid-column: 1/-1` → to_date bị đẩy xuống hàng mới | Tách nút Lọc ra ngoài `form-row`, đổi thành `.filter-date-row` (3 cột → 2 cột mobile) |
| Bottom nav 2 active link | `title.includes('vật tư')` match nhầm title "Báo cáo vật tư" và "Trang chủ - Quản lý vật tư nhà thờ" | Dùng `startsWith` / `===` thay `includes` |

---

## Thêm test mới — quy trình

1. **Xác định URL và selector** — đọc file view `.ejs` trước
2. **Xác định response pattern** — xem controller: redirect về `?success=` hay render trực tiếp?
3. **Chạy 1 test trước**: `npx playwright test --grep "tên test"`
4. **Debug khi fail**: xem screenshot trong `test-results/`
5. **Chạy lại toàn bộ** sau khi sửa

```bash
# Chạy 1 test cụ thể
npx playwright test --grep "Thêm vật tư mới"

# Xem screenshot khi fail
ls test-results/
```
