// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const TODAY = new Date().toISOString().split('T')[0];

// Helper: click submit nút chính của form (không phải quick-add)
async function submitMainForm(page) {
  await page.locator('#entryForm button[type="submit"]').click();
}

// ============================================================
// 1. TRANG CHỦ (Dashboard)
// ============================================================
test.describe('Dashboard', () => {
  test('Tải trang chủ thành công, hiển thị stat cards', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/Trang chủ/);
    await expect(page.locator('.stat-grid')).toBeVisible();
    await expect(page.locator('.stat-grid .stat-card')).toHaveCount(4);
    await expect(page.locator('.section-grid')).toBeVisible();
  });

  test('Điều hướng từ dashboard sang nhập vật tư', async ({ page }) => {
    await page.goto(BASE);
    await page.locator('a[href="/supplies/entry/xi_mang_sat_thep"]').first().click();
    await expect(page).toHaveURL(/supplies\/entry\/xi_mang_sat_thep/);
  });
});

// ============================================================
// 2. QUẢN LÝ VẬT TƯ (Materials)
// ============================================================
test.describe('Quản lý vật tư', () => {
  const MAT_NAME = `TestVatTu_${Date.now()}`;

  test('Tải trang danh sách vật tư', async ({ page }) => {
    await page.goto(`${BASE}/materials`);
    await expect(page).toHaveTitle(/vật tư/i);
    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-card-list')).toBeHidden();
  });

  test('Thêm vật tư mới', async ({ page }) => {
    await page.goto(`${BASE}/materials`);
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();

    await page.locator('#addModal input[name="name"]').fill(MAT_NAME);
    await page.locator('#addModal input[name="unit"]').fill('bao');
    await page.locator('#addModal input[name="default_price"]').fill('95000');
    await page.locator('#addModal select[name="category"]').selectOption('xi_mang_sat_thep');

    await Promise.all([
      page.waitForURL(/success=/),
      page.locator('#addModal button[type="submit"]').click(),
    ]);

    await expect(page).toHaveURL(/success=/);
    await expect(page.locator(`text=${MAT_NAME}`).first()).toBeVisible();
  });

  test('Lọc vật tư theo nhóm xi măng', async ({ page }) => {
    await page.goto(`${BASE}/materials?category=xi_mang_sat_thep`);
    await expect(page.locator('.chip.active')).toContainText('Xi măng');
    const greenBadges = page.locator('.badge-green');
    await expect(greenBadges).toHaveCount(0);
  });

  test('Sửa vật tư', async ({ page }) => {
    await page.goto(`${BASE}/materials`);
    const editBtns = page.locator('.desktop-table .btn-icon[title="Sửa"]');
    const count = await editBtns.count();
    if (count === 0) { test.skip(); return; }

    await editBtns.first().click();
    await expect(page.locator('#editModal')).toBeVisible();

    const newName = 'VatTu_Edited_' + Date.now();
    await page.locator('#edit_name').fill(newName);

    await Promise.all([
      page.waitForURL(/success=/),
      page.locator('#editForm button[type="submit"]').click(),
    ]);

    await expect(page).toHaveURL(/success=/);
  });
});

// ============================================================
// 3. NHẬP VẬT TƯ (Supply Entry)
// ============================================================
test.describe('Nhập vật tư', () => {
  test('Tải trang nhập xi măng sắt thép', async ({ page }) => {
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await expect(page).toHaveTitle(/Xi măng/);
    await expect(page.locator('#entryForm')).toBeVisible();
  });

  test('Tải trang nhập đá cát', async ({ page }) => {
    await page.goto(`${BASE}/supplies/entry/da_cat`);
    await expect(page).toHaveTitle(/Đá cát/);
    await expect(page.locator('#entryForm')).toBeVisible();
  });

  test('Chọn vật tư từ danh sách, tính thành tiền đúng', async ({ page }) => {
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    const select = page.locator('#material_select');
    const opts = await select.locator('option').all();
    let picked = false;
    for (const opt of opts) {
      const val = await opt.getAttribute('value');
      if (val && val !== '' && val !== 'custom') {
        await select.selectOption(val);
        picked = true;
        break;
      }
    }
    if (!picked) { test.skip(); return; }

    await page.locator('#entry_quantity').fill('10');
    await page.locator('#entry_price').fill('90000');
    await expect(page.locator('#total_display')).toContainText('900.000');
  });

  test('Nhập vật tư nhập tay (custom) và lưu thành công', async ({ page }) => {
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await page.locator('#material_select').selectOption('custom');
    await expect(page.locator('#custom_name_group')).toBeVisible();

    await page.locator('#custom_name').fill('Vật tư test e2e');
    await page.locator('#entry_unit').fill('tấn');
    await page.locator('#entry_quantity').fill('5');
    await page.locator('#entry_price').fill('500000');
    await page.locator('#entry_date').fill(TODAY);

    await expect(page.locator('#total_display')).toContainText('2.500.000');

    await Promise.all([
      page.waitForURL(/success=created/),
      page.locator('#entryForm button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/success=created/);
  });

  test('Submit thiếu trường bắt buộc → không submit', async ({ page }) => {
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    // Không điền gì, submit — HTML5 validation giữ lại trang
    await page.locator('#entryForm button[type="submit"]').click();
    // Vẫn ở trang entry (không có redirect)
    await expect(page).toHaveURL(/supplies\/entry\/xi_mang_sat_thep/);
    await expect(page.locator('#entryForm')).toBeVisible();
  });
});

// ============================================================
// 4. LỊCH SỬ VẬT TƯ
// ============================================================
test.describe('Lịch sử vật tư', () => {
  // Tạo dữ liệu trước khi test nhóm này
  test.beforeEach(async ({ page }) => {
    // Đảm bảo có ít nhất 1 phiếu để test sửa/xóa
  });

  test('Tải trang lịch sử xi măng', async ({ page }) => {
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    await expect(page).toHaveTitle(/Lịch sử/);
    await expect(page.locator('.total-bar')).toBeVisible();
  });

  test('Desktop: bảng hiện, card ẩn', async ({ page }) => {
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    await expect(page.locator('.desktop-table')).toBeVisible();
    await expect(page.locator('.mobile-card-list')).toBeHidden();
  });

  test('Mobile (390px): card hiện, bảng ẩn', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    await expect(page.locator('.desktop-table')).toBeHidden();
    await expect(page.locator('.mobile-card-list')).toBeVisible();
  });

  test('Sửa phiếu nhập qua modal', async ({ page }) => {
    // Đảm bảo có dữ liệu
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await page.locator('#material_select').selectOption('custom');
    await page.locator('#custom_name').fill('Phiếu test sửa');
    await page.locator('#entry_unit').fill('kg');
    await page.locator('#entry_quantity').fill('2');
    await page.locator('#entry_price').fill('50000');
    await page.locator('#entry_date').fill(TODAY);
    await Promise.all([
      page.waitForURL(/success=created/),
      page.locator('#entryForm button[type="submit"]').click(),
    ]);

    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    await page.locator('.desktop-table .btn-icon[title="Sửa"]').first().click();
    await expect(page.locator('#editModal')).toBeVisible();

    await page.locator('#edit_note').fill('Ghi chú test e2e ' + Date.now());

    await Promise.all([
      page.waitForURL(/success=/),
      page.locator('#editForm button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/success=/);
  });

  test('Xóa phiếu nhập', async ({ page }) => {
    // Tạo phiếu để xóa
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await page.locator('#material_select').selectOption('custom');
    await page.locator('#custom_name').fill('Phiếu test xóa');
    await page.locator('#entry_unit').fill('kg');
    await page.locator('#entry_quantity').fill('1');
    await page.locator('#entry_price').fill('1000');
    await page.locator('#entry_date').fill(TODAY);
    await Promise.all([
      page.waitForURL(/success=created/),
      page.locator('#entryForm button[type="submit"]').click(),
    ]);

    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    page.on('dialog', d => d.accept());
    const deleteBtns = page.locator('.desktop-table form[action*="delete"] button[type="submit"]');
    const delCount = await deleteBtns.count();
    if (delCount === 0) { test.skip(); return; }

    await Promise.all([
      page.waitForURL(/success=/),
      deleteBtns.first().click(),
    ]);
    await expect(page).toHaveURL(/success=/);
  });
});

// ============================================================
// 5. BÁO CÁO
// ============================================================
test.describe('Báo cáo', () => {
  test('Tải trang báo cáo', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await expect(page).toHaveTitle(/Báo cáo/);
    await expect(page.locator('.filter-card')).toBeVisible();
  });

  test('Ô tên khách hàng: nhập → cập nhật tiêu đề báo cáo', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await page.locator('#customerNameInput').fill('Nhà thờ Test E2E');
    const titles = page.locator('.report-customer-inline');
    const count = await titles.count();
    expect(count).toBeGreaterThan(0);
    for (const el of await titles.all()) {
      await expect(el).toContainText('Nhà thờ Test E2E');
    }
  });

  test('localStorage lưu tên khách hàng', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await page.locator('#customerNameInput').fill('Lưu LocalStorage Test');
    await page.reload();
    await expect(page.locator('#customerNameInput')).toHaveValue('Lưu LocalStorage Test');
  });

  test('Lọc báo cáo theo khoảng ngày', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await page.locator('input[name="from_date"]').fill('2025-01-01');
    await page.locator('input[name="to_date"]').fill('2025-12-31');
    await Promise.all([
      page.waitForURL(/from_date=2025-01-01/),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/from_date=2025-01-01/);
    // Có ít nhất 1 report section
    await expect(page.locator('.report-section').first()).toBeVisible();
  });

  test('Lọc theo nhóm xi măng → chỉ 1 report section', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    await page.locator('select[name="category"]').selectOption('xi_mang_sat_thep');
    await Promise.all([
      page.waitForURL(/category=xi_mang_sat_thep/),
      page.locator('button[type="submit"]').click(),
    ]);
    await expect(page.locator('.report-section')).toHaveCount(1);
  });

  test('Trang in: render đúng, không có phần ký tên', async ({ page }) => {
    await page.goto(`${BASE}/report/print?from_date=2025-01-01&to_date=2025-12-31&category=all`);
    await expect(page.locator('#titleInput')).toBeVisible();
    await expect(page.locator('.footer-signature')).toHaveCount(0);
    // Có ít nhất 1 bảng
    await expect(page.locator('table').first()).toBeVisible();
  });

  test('Trang in: tên khách hàng từ query string', async ({ page }) => {
    await page.goto(`${BASE}/report/print?from_date=2025-01-01&to_date=2025-12-31&category=all&customer_name=Nh%C3%A0+th%E1%BB%9D+Query`);
    await expect(page.locator('#titleInput')).toHaveValue('Nhà thờ Query');
    const catLines = page.locator('[id^="catLine_"]');
    for (const el of await catLines.all()) {
      await expect(el).toContainText('Nhà thờ Query');
    }
  });

  test('Trang in: nhập tên → tiêu đề cập nhật ngay', async ({ page }) => {
    await page.goto(`${BASE}/report/print?from_date=2025-01-01&to_date=2025-12-31&category=all`);
    await page.locator('#titleInput').fill('Giáo xứ ABC');
    await expect(page.locator('#catLine_0')).toContainText('Giáo xứ ABC');
  });
});

// ============================================================
// 6. EXPORT EXCEL
// ============================================================
test.describe('Export Excel', () => {
  test('Download file Excel từ nút Xuất Excel', async ({ page }) => {
    await page.goto(`${BASE}/report`);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportBtn').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('Export Excel HTTP 200, content-type đúng', async ({ page }) => {
    const url = `${BASE}/report/export?from_date=2025-01-01&to_date=2025-12-31&category=all&customer_name=TestKH`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('spreadsheetml');
    expect(response.headers()['content-disposition']).toContain('.xlsx');
  });

  test('Export Excel chỉ nhóm xi măng', async ({ page }) => {
    const url = `${BASE}/report/export?from_date=2025-01-01&to_date=2025-12-31&category=xi_mang_sat_thep`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(100);
  });
});

// ============================================================
// 7. RESPONSIVE LAYOUT
// ============================================================
test.describe('Responsive layout', () => {
  const mobileVP = { width: 390, height: 844 };
  const desktopVP = { width: 1280, height: 800 };

  for (const path of ['/supplies/history/xi_mang_sat_thep', '/materials']) {
    test(`${path}: mobile dùng card, desktop dùng bảng`, async ({ page }) => {
      await page.setViewportSize(mobileVP);
      await page.goto(`${BASE}${path}`);
      await expect(page.locator('.desktop-table')).toBeHidden();
      await expect(page.locator('.mobile-card-list')).toBeVisible();

      await page.setViewportSize(desktopVP);
      await page.reload();
      await expect(page.locator('.desktop-table')).toBeVisible();
      await expect(page.locator('.mobile-card-list')).toBeHidden();
    });
  }

  test('Mobile: không có overflow-x:hidden cắt nội dung', async ({ page }) => {
    await page.setViewportSize(mobileVP);
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    const bad = await page.evaluate(() => {
      return [...document.querySelectorAll('*')]
        .filter(el => {
          const s = getComputedStyle(el);
          return s.overflowX === 'hidden' && el.scrollWidth > el.clientWidth + 2;
        })
        .map(el => el.className);
    });
    expect(bad).toHaveLength(0);
  });

  test('Mobile: bottom nav hiển thị, top nav ẩn', async ({ page }) => {
    await page.setViewportSize(mobileVP);
    await page.goto(BASE);
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.nav-desktop')).toBeHidden();
  });

  test('Desktop: top nav hiển thị, bottom nav ẩn', async ({ page }) => {
    await page.setViewportSize(desktopVP);
    await page.goto(BASE);
    await expect(page.locator('.nav-desktop')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeHidden();
  });
});

// ============================================================
// 8. LƯU DỮ LIỆU (JSON file)
// ============================================================
test.describe('Lưu dữ liệu JSON', () => {
  test('Dữ liệu nhập xuất hiện ngay trong lịch sử', async ({ page }) => {
    const matName = 'E2E_JsonSave_' + Date.now();

    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await page.locator('#material_select').selectOption('custom');
    await page.locator('#custom_name').fill(matName);
    await page.locator('#entry_unit').fill('túi');
    await page.locator('#entry_quantity').fill('3');
    await page.locator('#entry_price').fill('120000');
    await page.locator('#entry_date').fill(TODAY);

    await Promise.all([
      page.waitForURL(/success=created/),
      page.locator('#entryForm button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/success=created/);

    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    await expect(page.locator(`text=${matName}`).first()).toBeVisible();
    await expect(page.locator('.total-bar strong')).toBeVisible();
  });

  test('Dữ liệu tồn tại sau khi reload trang', async ({ page }) => {
    // Đọc số lượng phiếu hiện tại
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    const totalText = await page.locator('.total-bar span:last-child').textContent();

    await page.reload();
    const totalTextAfter = await page.locator('.total-bar span:last-child').textContent();
    expect(totalText).toBe(totalTextAfter);
  });
});
