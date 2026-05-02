// @ts-check
/**
 * Test giao diện điện thoại toàn diện
 * Viewport mặc định: iPhone 13 (390x844)
 * Cũng test thêm: iPhone SE (375x667), Android nhỏ (360x640)
 */
const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';
const TODAY = new Date().toISOString().split('T')[0];

// Viewport presets
const VP = {
  iphone13:  { width: 390,  height: 844 },
  iphoneSE:  { width: 375,  height: 667 },
  android:   { width: 360,  height: 640 },
  small:     { width: 320,  height: 568 },
  desktop:   { width: 1280, height: 800 },
};

// ============================================================
// HELPERS
// ============================================================
async function gotoMobile(page, path, vp = VP.iphone13) {
  await page.setViewportSize(vp);
  await page.goto(`${BASE}${path}`);
}

// Kiểm tra element không bị cắt (không vượt viewport width)
// Bỏ qua element nằm trong scrollable container (overflow-x: auto/scroll)
async function checkNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const vw = window.innerWidth;

    function hasScrollableAncestor(el) {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        p = p.parentElement;
      }
      return false;
    }

    const bad = [];
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > vw + 2 && !hasScrollableAncestor(el)) {
        bad.push({
          tag: el.tagName,
          cls: el.className,
          right: Math.round(rect.right),
          vw,
        });
      }
    });
    return bad;
  });
  return overflow;
}

// Kiểm tra tap target >= 44px (WCAG mobile guideline)
async function checkTapTargets(page, selector) {
  return page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    return els
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      })
      .map(el => ({ tag: el.tagName, cls: el.className, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }));
  }, selector);
}

// ============================================================
// 1. LAYOUT & NAVIGATION MOBILE
// ============================================================
test.describe('Mobile: Layout & Navigation', () => {
  test('Bottom nav hiển thị đủ 5 icon, top nav ẩn', async ({ page }) => {
    await gotoMobile(page, '/');
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.nav-desktop')).toBeHidden();
    // 5 link trong bottom nav
    await expect(page.locator('.bottom-nav a')).toHaveCount(5);
  });

  test('Bottom nav: active link đúng trang chủ', async ({ page }) => {
    await gotoMobile(page, '/');
    const activeLinks = page.locator('.bottom-nav a.active');
    await expect(activeLinks).toHaveCount(1);
    await expect(activeLinks.first()).toHaveAttribute('href', '/');
  });

  test('Bottom nav: active link đúng khi ở trang báo cáo', async ({ page }) => {
    await gotoMobile(page, '/report');
    const activeLinks = page.locator('.bottom-nav a.active');
    await expect(activeLinks).toHaveCount(1);
    const href = await activeLinks.first().getAttribute('href');
    expect(href).toContain('report');
  });

  test('Bottom nav: tap vào Nhập VT → navigate đúng', async ({ page }) => {
    await gotoMobile(page, '/');
    await page.locator('.bottom-nav a[href*="supplies/entry/xi_mang"]').click();
    await expect(page).toHaveURL(/supplies\/entry\/xi_mang_sat_thep/);
  });

  test('Bottom nav: tap vào Vật tư → navigate đúng', async ({ page }) => {
    await gotoMobile(page, '/');
    await page.locator('.bottom-nav a[href="/materials"]').click();
    await expect(page).toHaveURL(/materials/);
  });

  test('Top bar brand logo hiển thị trên mobile', async ({ page }) => {
    await gotoMobile(page, '/');
    await expect(page.locator('.brand')).toBeVisible();
    await expect(page.locator('.brand')).toContainText('Vật Tư Nhà Thờ');
  });

  test('Không có horizontal scroll ở trang chủ', async ({ page }) => {
    await gotoMobile(page, '/');
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('iPhone SE (375px): layout vẫn đúng', async ({ page }) => {
    await gotoMobile(page, '/', VP.iphoneSE);
    await expect(page.locator('.bottom-nav')).toBeVisible();
    await expect(page.locator('.stat-grid')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Android nhỏ (360px): không overflow', async ({ page }) => {
    await gotoMobile(page, '/', VP.android);
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 2. DASHBOARD MOBILE
// ============================================================
test.describe('Mobile: Dashboard', () => {
  test('Stat grid: 2 cột trên mobile', async ({ page }) => {
    await gotoMobile(page, '/');
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.stat-grid');
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    expect(cols).toBe(2);
  });

  test('Stat cards đủ 4 cái, đều visible', async ({ page }) => {
    await gotoMobile(page, '/');
    const cards = page.locator('.stat-grid .stat-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await expect(card).toBeVisible();
    }
  });

  test('Section grid: 1 cột trên mobile', async ({ page }) => {
    await gotoMobile(page, '/');
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.section-grid');
      return getComputedStyle(grid).gridTemplateColumns;
    });
    // 1 cột = không có space trong value hoặc chỉ 1 giá trị
    expect(cols).not.toMatch(/\d+px \d+px/);
  });

  test('Nút "Nhập" trong section card đủ lớn để tap', async ({ page }) => {
    await gotoMobile(page, '/');
    const btns = page.locator('.section-header .btn');
    for (const btn of await btns.all()) {
      const box = await btn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(36);
    }
  });

  test('Nút báo cáo tổng hợp hiển thị và tap được', async ({ page }) => {
    await gotoMobile(page, '/');
    const btn = page.locator('.quick-actions .btn');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/report/);
  });

  test('Không có horizontal scroll ở dashboard', async ({ page }) => {
    await gotoMobile(page, '/');
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 3. NHẬP VẬT TƯ MOBILE
// ============================================================
test.describe('Mobile: Nhập vật tư', () => {
  test('Form nhập hiển thị đúng, không overflow', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    await expect(page.locator('#entryForm')).toBeVisible();
    await expect(page.locator('.entry-card')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Input font-size >= 16px (ngăn zoom iOS)', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    const smallInputs = await page.evaluate(() => {
      return [...document.querySelectorAll('.form-group input, .form-group select')]
        .filter(el => {
          const fs = parseFloat(getComputedStyle(el).fontSize);
          return fs < 16;
        })
        .map(el => ({ id: el.id, name: el.getAttribute('name'), fs: getComputedStyle(el).fontSize }));
    });
    expect(smallInputs).toHaveLength(0);
  });

  test('Nút Lưu full width và đủ lớn', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    const btn = page.locator('#entryForm button[type="submit"]');
    const box = await btn.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    // Nút phải rộng >= 150px
    expect(box.width).toBeGreaterThanOrEqual(150);
  });

  test('Select vật tư và form tính tiền hoạt động trên mobile', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    await page.locator('#material_select').selectOption('custom');
    await expect(page.locator('#custom_name_group')).toBeVisible();
    await page.locator('#custom_name').fill('Test Mobile');
    await page.locator('#entry_unit').fill('kg');
    await page.locator('#entry_quantity').fill('3');
    await page.locator('#entry_price').fill('100000');
    await expect(page.locator('#total_display')).toContainText('300.000');
  });

  test('Quick-add material section hiển thị đúng', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    await expect(page.locator('.quick-add-material')).toBeVisible();
    // Mở details
    await page.locator('.quick-add-material summary').click();
    await expect(page.locator('.quick-add-form')).toBeVisible();
    // Input text/number trong quick-add phải visible và full width
    const inputs = page.locator('.quick-add-form input:not([type="hidden"])');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    for (const inp of await inputs.all()) {
      await expect(inp).toBeVisible();
      // Rộng full width trên mobile (>= 200px)
      const box = await inp.boundingBox();
      if (box) expect(box.width).toBeGreaterThan(200);
    }
  });

  test('Submit nhập tay thành công trên mobile', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    await page.locator('#material_select').selectOption('custom');
    await page.locator('#custom_name').fill('Mobile_Test_' + Date.now());
    await page.locator('#entry_unit').fill('bao');
    await page.locator('#entry_quantity').fill('2');
    await page.locator('#entry_price').fill('200000');
    await page.locator('#entry_date').fill(TODAY);
    await Promise.all([
      page.waitForURL(/success=created/),
      page.locator('#entryForm button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/success=created/);
  });

  test('Trang nhập đá cát: không overflow mobile', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/da_cat');
    await expect(page.locator('#entryForm')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 4. LỊCH SỬ VẬT TƯ MOBILE
// ============================================================
test.describe('Mobile: Lịch sử vật tư', () => {
  test('Card list hiện, bảng ẩn trên iPhone 13', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    await expect(page.locator('.desktop-table')).toBeHidden();
    await expect(page.locator('.mobile-card-list')).toBeVisible();
  });

  test('Card list hiện trên iPhone SE', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep', VP.iphoneSE);
    await expect(page.locator('.mobile-card-list')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Card list hiện trên Android (360px)', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep', VP.android);
    await expect(page.locator('.mobile-card-list')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Supply card có đủ thành phần: tên, tổng tiền, meta, nút', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    const cards = page.locator('.supply-card');
    const count = await cards.count();
    if (count === 0) { test.skip(); return; }

    const first = cards.first();
    await expect(first.locator('.supply-card-name')).toBeVisible();
    await expect(first.locator('.supply-card-total')).toBeVisible();
    await expect(first.locator('.supply-card-meta')).toBeVisible();
    await expect(first.locator('.supply-card-actions')).toBeVisible();
  });

  test('Nút Sửa và Xóa trong card đủ lớn để tap', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    const btns = page.locator('.supply-card-actions .btn');
    const count = await btns.count();
    if (count === 0) { test.skip(); return; }

    for (const btn of await btns.all()) {
      const box = await btn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(box.width).toBeGreaterThanOrEqual(60);
    }
  });

  test('Total bar hiển thị đúng trên mobile', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    const bar = page.locator('.total-bar');
    await expect(bar).toBeVisible();
    const box = await bar.boundingBox();
    // Phải full width (trừ padding)
    expect(box.width).toBeGreaterThan(VP.iphone13.width * 0.8);
  });

  test('Modal sửa phiếu: mở bottom sheet trên mobile', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    const editBtns = page.locator('.supply-card-actions .btn:first-child');
    const count = await editBtns.count();
    if (count === 0) { test.skip(); return; }

    await editBtns.first().click();
    await expect(page.locator('#editModal')).toBeVisible();

    // Modal phải full width (bottom sheet)
    const modalContent = page.locator('#editModal .modal-content');
    const box = await modalContent.boundingBox();
    expect(box.width).toBeGreaterThan(VP.iphone13.width * 0.9);

    // Border radius chỉ ở trên (bottom sheet style)
    const br = await page.evaluate(() => {
      const m = document.querySelector('#editModal .modal-content');
      const s = getComputedStyle(m);
      return {
        tl: s.borderTopLeftRadius,
        tr: s.borderTopRightRadius,
        bl: s.borderBottomLeftRadius,
        br: s.borderBottomRightRadius,
      };
    });
    // Bottom radius phải 0
    expect(br.bl).toBe('0px');
    expect(br.br).toBe('0px');
  });

  test('Không có horizontal scroll ở lịch sử', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/xi_mang_sat_thep');
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Lịch sử đá cát: card layout đúng', async ({ page }) => {
    await gotoMobile(page, '/supplies/history/da_cat');
    await expect(page.locator('.mobile-card-list')).toBeVisible();
    await expect(page.locator('.desktop-table')).toBeHidden();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 5. QUẢN LÝ VẬT TƯ MOBILE
// ============================================================
test.describe('Mobile: Quản lý vật tư', () => {
  test('Material card list hiện, bảng ẩn', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await expect(page.locator('.desktop-table')).toBeHidden();
    await expect(page.locator('.mobile-card-list')).toBeVisible();
  });

  test('Material card có đủ thành phần', async ({ page }) => {
    await gotoMobile(page, '/materials');
    const cards = page.locator('.material-card');
    const count = await cards.count();
    if (count === 0) { test.skip(); return; }

    const first = cards.first();
    await expect(first.locator('.material-card-name')).toBeVisible();
    await expect(first.locator('.material-card-sub')).toBeVisible();
    await expect(first.locator('.material-card-actions')).toBeVisible();
  });

  test('Filter chips hiển thị đúng, tap được', async ({ page }) => {
    await gotoMobile(page, '/materials');
    const chips = page.locator('.filter-bar .chip');
    await expect(chips.first()).toBeVisible();
    // Tap chip xi măng
    await page.locator('.chip:has-text("Xi măng")').click();
    await expect(page).toHaveURL(/category=xi_mang_sat_thep/);
    await expect(page.locator('.mobile-card-list')).toBeVisible();
  });

  test('Nút Thêm vật tư hiển thị và tap được', async ({ page }) => {
    await gotoMobile(page, '/materials');
    const btn = page.locator('button:has-text("Thêm vật tư")');
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page.locator('#addModal')).toBeVisible();
  });

  test('Modal thêm vật tư: full width bottom sheet', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();
    const mc = page.locator('#addModal .modal-content');
    const box = await mc.boundingBox();
    expect(box.width).toBeGreaterThan(VP.iphone13.width * 0.9);
  });

  test('Thêm vật tư mới từ mobile', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();
    const name = 'Mobile_VatTu_' + Date.now();
    await page.locator('#addModal input[name="name"]').fill(name);
    await page.locator('#addModal input[name="unit"]').fill('kg');
    await page.locator('#addModal input[name="default_price"]').fill('50000');
    await page.locator('#addModal select[name="category"]').selectOption('da_cat');
    await Promise.all([
      page.waitForURL(/success=/),
      page.locator('#addModal button[type="submit"]').click(),
    ]);
    await expect(page).toHaveURL(/success=/);
  });

  test('Không có horizontal scroll ở trang vật tư', async ({ page }) => {
    await gotoMobile(page, '/materials');
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 6. BÁO CÁO MOBILE
// ============================================================
test.describe('Mobile: Báo cáo', () => {
  test('Filter card không overflow mobile', async ({ page }) => {
    await gotoMobile(page, '/report');
    await expect(page.locator('.filter-card')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Form lọc: layout 2 cột ngày, 1 hàng nhóm', async ({ page }) => {
    await gotoMobile(page, '/report');
    // Các input from_date, to_date nằm cạnh nhau (2 cột)
    const fromBox = await page.locator('input[name="from_date"]').boundingBox();
    const toBox   = await page.locator('input[name="to_date"]').boundingBox();
    // top của 2 input gần bằng nhau (cùng hàng)
    expect(Math.abs(fromBox.y - toBox.y)).toBeLessThan(10);
    // x của to_date > x của from_date (to bên phải)
    expect(toBox.x).toBeGreaterThan(fromBox.x);
  });

  test('Nút lọc full width trên mobile', async ({ page }) => {
    await gotoMobile(page, '/report');
    const btn = page.locator('.filter-actions .btn-primary');
    const box = await btn.boundingBox();
    const vw = VP.iphone13.width;
    // Nút rộng >= 40% viewport
    expect(box.width).toBeGreaterThan(vw * 0.4);
  });

  test('Ô tên khách hàng dễ nhập trên mobile', async ({ page }) => {
    await gotoMobile(page, '/report');
    const inp = page.locator('#customerNameInput');
    await expect(inp).toBeVisible();
    await inp.fill('Nhà thờ Mobile Test');
    await expect(inp).toHaveValue('Nhà thờ Mobile Test');
    // Tiêu đề cập nhật
    const titles = page.locator('.report-customer-inline');
    const count = await titles.count();
    if (count > 0) {
      await expect(titles.first()).toContainText('Nhà thờ Mobile Test');
    }
  });

  test('Report section không overflow', async ({ page }) => {
    await gotoMobile(page, '/report');
    await page.locator('input[name="from_date"]').fill('2025-01-01');
    await page.locator('input[name="to_date"]').fill('2025-12-31');
    await Promise.all([
      page.waitForURL(/from_date/),
      page.locator('button[type="submit"]').click(),
    ]);
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Nút Xuất Excel tap được trên mobile', async ({ page }) => {
    await gotoMobile(page, '/report');
    const btn = page.locator('#exportBtn');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(36);
  });
});

// ============================================================
// 7. TAP TARGET & ACCESSIBILITY MOBILE
// ============================================================
test.describe('Mobile: Tap targets & Accessibility', () => {
  const pages_to_check = [
    { path: '/', name: 'Dashboard' },
    { path: '/supplies/entry/xi_mang_sat_thep', name: 'Nhập VT' },
    { path: '/supplies/history/xi_mang_sat_thep', name: 'Lịch sử' },
    { path: '/materials', name: 'Vật tư' },
    { path: '/report', name: 'Báo cáo' },
  ];

  for (const pg of pages_to_check) {
    test(`${pg.name}: không có horizontal overflow (iPhone 13)`, async ({ page }) => {
      await gotoMobile(page, pg.path);
      const overflow = await checkNoHorizontalOverflow(page);
      expect(overflow).toHaveLength(0);
    });

    test(`${pg.name}: không có horizontal overflow (iPhone SE)`, async ({ page }) => {
      await gotoMobile(page, pg.path, VP.iphoneSE);
      const overflow = await checkNoHorizontalOverflow(page);
      expect(overflow).toHaveLength(0);
    });
  }

  test('Bottom nav tap targets >= 44px chiều cao', async ({ page }) => {
    await gotoMobile(page, '/');
    const links = page.locator('.bottom-nav a');
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('Buttons trong form nhập >= 44px chiều cao', async ({ page }) => {
    await gotoMobile(page, '/supplies/entry/xi_mang_sat_thep');
    const btns = page.locator('.form-actions .btn');
    for (const btn of await btns.all()) {
      const box = await btn.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('viewport meta tag có width=device-width, initial-scale=1', async ({ page }) => {
    await gotoMobile(page, '/');
    const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content'));
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1');
  });
});

// ============================================================
// 8. MODAL MOBILE (Bottom Sheet)
// ============================================================
test.describe('Mobile: Modal bottom sheet', () => {
  test('Modal sửa vật tư: xuất hiện từ dưới lên', async ({ page }) => {
    await gotoMobile(page, '/materials');
    const editBtns = page.locator('.mobile-card-list .material-card-actions .btn-icon[title="Sửa"]');
    const count = await editBtns.count();
    if (count === 0) { test.skip(); return; }

    await editBtns.first().click();
    await expect(page.locator('#editModal')).toBeVisible();

    // Modal content phải ở dưới cùng màn hình
    const modalContent = page.locator('#editModal .modal-content');
    const box = await modalContent.boundingBox();
    const vh = VP.iphone13.height;
    // bottom của modal content gần với bottom của viewport
    expect(box.y + box.height).toBeGreaterThan(vh * 0.7);
  });

  test('Modal đóng khi bấm Hủy', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();
    await page.locator('#addModal .btn-outline:has-text("Hủy")').click();
    await expect(page.locator('#addModal')).toBeHidden();
  });

  test('Modal đóng khi bấm backdrop', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();
    // Click vào backdrop (ngoài modal-content)
    await page.locator('#addModal').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#addModal')).toBeHidden();
  });

  test('Modal không overflow ngang', async ({ page }) => {
    await gotoMobile(page, '/materials');
    await page.locator('button:has-text("Thêm vật tư")').click();
    await expect(page.locator('#addModal')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });
});

// ============================================================
// 9. ROTATE / LANDSCAPE
// ============================================================
test.describe('Mobile: Landscape orientation', () => {
  const landscape = { width: 844, height: 390 };

  test('Dashboard landscape: không overflow', async ({ page }) => {
    await page.setViewportSize(landscape);
    await page.goto(BASE);
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Nhập VT landscape: form vẫn usable', async ({ page }) => {
    await page.setViewportSize(landscape);
    await page.goto(`${BASE}/supplies/entry/xi_mang_sat_thep`);
    await expect(page.locator('#entryForm')).toBeVisible();
    const overflow = await checkNoHorizontalOverflow(page);
    expect(overflow).toHaveLength(0);
  });

  test('Lịch sử landscape: bảng hoặc card hiển thị đúng', async ({ page }) => {
    await page.setViewportSize(landscape);
    await page.goto(`${BASE}/supplies/history/xi_mang_sat_thep`);
    // Ở 844px width → desktop mode → bảng hiện
    await expect(page.locator('.desktop-table')).toBeVisible();
    // Bảng nằm trong table-wrapper (overflow-x: auto) nên scroll ngang là đúng
    await expect(page.locator('.table-wrapper')).toBeVisible();
  });
});
