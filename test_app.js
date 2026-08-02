const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\b20f5bf6-286f-4e61-bcdd-2315a3edfa3c';

async function runFullAudit() {
  console.log('Starting Playwright Chromium instance...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  async function snap(name) {
    const filePath = path.join(ARTIFACTS_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`📸 [CAPTURED]: ${name}.png`);
  }

  async function fillLogin(phone, password) {
    console.log(`Navigating to login... (${phone})`);
    await page.goto('http://localhost:8081/(auth)/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const inputs = await page.$$('input');
    console.log(`Found ${inputs.length} input fields on login page.`);

    if (inputs.length >= 2) {
      await inputs[0].fill(phone);
      await inputs[1].fill(password);
      await snap(`01_${phone}_credentials_entered`);

      // Click Log In button
      const buttons = await page.$$('div[role="button"], button');
      for (const btn of buttons) {
        const text = (await btn.innerText()).trim();
        if (text.toLowerCase().includes('log in') || text.toLowerCase().includes('sign in')) {
          console.log(`Clicking button: "${text}"`);
          await btn.click();
          break;
        }
      }
    }

    await page.waitForTimeout(3000);

    // Check for PIN screen
    const bodyText = await page.innerText('body');
    if (bodyText.includes('PIN') || bodyText.includes('Pin') || bodyText.includes('Security')) {
      console.log('Entering PIN: 123456');
      for (const char of '123456') {
        await page.keyboard.press(char);
        await page.waitForTimeout(150);
      }
      await page.waitForTimeout(2500);
    }
  }

  try {
    // ════════════════════════════════════════════════════════════════════
    // 1. ADMIN AUDIT (9920657659 / FineGlaze@2026)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- STARTING ADMIN AUDIT ---');
    await fillLogin('9920657659', 'FineGlaze@2026');
    await snap('02_admin_dashboard_home');

    // Admin pages to audit directly via router URLs
    const adminPages = [
      { name: 'admin_all_sites', url: 'http://localhost:8081/(admin)/all-sites' },
      { name: 'admin_analytics', url: 'http://localhost:8081/(admin)/analytics' },
      { name: 'admin_employees', url: 'http://localhost:8081/(admin)/employees' },
      { name: 'admin_boq_materials', url: 'http://localhost:8081/(admin)/materials' },
      { name: 'admin_attendance_report', url: 'http://localhost:8081/(admin)/attendance-report' },
      { name: 'admin_create_project', url: 'http://localhost:8081/(admin)/create-project' },
      { name: 'admin_company_settings', url: 'http://localhost:8081/(admin)/company-settings' },
      { name: 'admin_my_profile', url: 'http://localhost:8081/(admin)/my-profile' },
    ];

    for (const p of adminPages) {
      console.log(`Auditing Admin Page: ${p.name}...`);
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await snap(`03_${p.name}`);
    }

    // ════════════════════════════════════════════════════════════════════
    // 2. WORKER AUDIT (9876543210 / FineGlaze@2026)
    // ════════════════════════════════════════════════════════════════════
    console.log('\n--- STARTING WORKER AUDIT ---');
    await fillLogin('9876543210', 'FineGlaze@2026');
    await snap('04_worker_dashboard_home');

    const workerPages = [
      { name: 'worker_my_site', url: 'http://localhost:8081/(worker)/my-site' },
      { name: 'worker_documents', url: 'http://localhost:8081/(worker)/documents' },
      { name: 'worker_safety_checklist', url: 'http://localhost:8081/(worker)/safety-checklist' },
      { name: 'worker_leave_request', url: 'http://localhost:8081/(worker)/leave-request' },
      { name: 'worker_profile', url: 'http://localhost:8081/(worker)/profile' },
    ];

    for (const p of workerPages) {
      console.log(`Auditing Worker Page: ${p.name}...`);
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await snap(`05_${p.name}`);
    }

    console.log('\n✅ Full Browser Audit Finished Successfully!');

  } catch (err) {
    console.error('Audit Error:', err);
    await snap('99_audit_error_state');
  } finally {
    await browser.close();
  }
}

runFullAudit();
