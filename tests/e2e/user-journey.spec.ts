import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Helper functions
async function login(page: Page, role: 'teacher' | 'admin' = 'teacher') {
  await page.goto('/');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Mock authentication if needed
  await page.evaluate((userRole) => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'test-user',
        name: 'Test User',
        role: userRole,
        email: 'test@example.com',
      }),
    );
    localStorage.setItem('auth_token', 'mock-token');
  }, role);

  await page.reload();
}

async function waitForAnalytics(page: Page) {
  // Wait for analytics to complete
  await page.waitForFunction(
    () => {
      const status = document.querySelector('[data-testid="analytics-status"]');
      return status && !status.textContent?.includes('Processing');
    },
    { timeout: 30000 },
  );
}

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock data
    await page.addInitScript(() => {
      localStorage.setItem('VITE_USE_MOCK', '1');
    });
  });

  test.describe('Student Management Journey', () => {
    test('complete student onboarding flow', async ({ page }) => {
      await login(page);

      // Navigate to students page
      await page.click('[data-testid="nav-students"]');
      await expect(page).toHaveURL(/\/students/);

      // Click add student button
      await page.click('[data-testid="add-student-btn"]');

      // Fill in student details
      await page.fill('[name="name"]', 'New Student');
      await page.fill('[name="age"]', '10');
      await page.selectOption('[name="grade"]', '5');

      // Add initial assessment
      await page.click('[data-testid="add-assessment"]');
      await page.fill('[name="assessmentScore"]', '75');
      await page.selectOption('[name="assessmentType"]', 'initial');

      // Submit form
      await page.click('[type="submit"]');

      // Verify student was added
      await expect(page.locator('text=New Student')).toBeVisible();
      await expect(page.locator('[data-testid="student-card"]')).toContainText('Grade 5');
    });

    test('edit student profile and track progress', async ({ page }) => {
      await login(page);

      // Navigate to students
      await page.click('[data-testid="nav-students"]');

      // Click on first student card
      await page.click('[data-testid="student-card"]:first-child');

      // Wait for profile to load
      await expect(page.locator('[data-testid="student-profile"]')).toBeVisible();

      // Edit student information
      await page.click('[data-testid="edit-student-btn"]');
      await page.fill('[name="notes"]', 'Updated progress notes');

      // Add new session
      await page.click('[data-testid="add-session-btn"]');
      await page.fill('[name="duration"]', '45');
      await page.fill('[name="progress"]', '0.8');
      await page.click('[data-testid="save-session"]');

      // Verify session was added
      await expect(page.locator('[data-testid="session-list"]')).toContainText('45 minutes');

      // Check analytics updated
      await waitForAnalytics(page);
      await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
    });
  });

  test.describe('Analytics Dashboard Journey', () => {
    test('view and interact with analytics dashboard', async ({ page }) => {
      await login(page);

      // Navigate to dashboard
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page).toHaveURL(/\/dashboard/);

      // Wait for charts to load
      await page.waitForSelector('[data-testid="analytics-chart"]', { timeout: 10000 });

      // Switch between tabs
      await page.click('[role="tab"]:has-text("Patterns")');
      await expect(page.locator('[data-testid="patterns-view"]')).toBeVisible();

      await page.click('[role="tab"]:has-text("Insights")');
      await expect(page.locator('[data-testid="insights-view"]')).toBeVisible();

      // Apply filters
      await page.click('[data-testid="filter-button"]');
      await page.selectOption('[name="dateRange"]', 'last30days');
      await page.click('[data-testid="apply-filters"]');

      // Verify data updated
      await waitForAnalytics(page);
      await expect(page.locator('[data-testid="data-summary"]')).toContainText('Last 30 days');
    });

    test('export analytics data', async ({ page }) => {
      await login(page);

      // Navigate to dashboard
      await page.click('[data-testid="nav-dashboard"]');

      // Wait for data to load
      await waitForAnalytics(page);

      // Open export dialog
      await page.click('[data-testid="export-button"]');
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Select export options
      await page.check('[name="includeCharts"]');
      await page.check('[name="includeRawData"]');
      await page.selectOption('[name="format"]', 'pdf');

      // Trigger download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="confirm-export"]');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/analytics.*\.pdf/);
    });

    test('real-time data updates', async ({ page }) => {
      await login(page);

      // Navigate to dashboard
      await page.click('[data-testid="nav-dashboard"]');

      // Enable real-time updates
      await page.click('[data-testid="toggle-realtime"]');
      await expect(page.locator('[data-testid="realtime-indicator"]')).toHaveClass(/active/);

      // Simulate new data
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent('new-session-data', {
            detail: {
              studentId: 'student-1',
              session: {
                duration: 30,
                progress: 0.7,
                timestamp: new Date().toISOString(),
              },
            },
          }),
        );
      });

      // Wait for update
      await page.waitForFunction(() => {
        const indicator = document.querySelector('[data-testid="last-updated"]');
        return indicator?.textContent?.includes('Just now');
      });

      // Verify chart updated
      await expect(page.locator('[data-testid="realtime-chart"]')).toBeVisible();
    });
  });

  test.describe('Report Generation Journey', () => {
    test('generate comprehensive student report', async ({ page }) => {
      await login(page);

      // Navigate to reports
      await page.click('[data-testid="nav-reports"]');
      await expect(page).toHaveURL(/\/reports/);

      // Select report type
      await page.selectOption('[name="reportType"]', 'comprehensive');

      // Select students
      await page.click('[data-testid="select-all-students"]');

      // Configure report options
      await page.click('[data-testid="report-options"]');
      await page.check('[name="includeGraphs"]');
      await page.check('[name="includeRecommendations"]');
      await page.selectOption('[name="period"]', 'semester');

      // Generate report
      await page.click('[data-testid="generate-report"]');

      // Wait for generation
      await page.waitForSelector('[data-testid="report-preview"]', { timeout: 15000 });

      // Verify report content
      await expect(page.locator('[data-testid="report-header"]')).toContainText(
        'Comprehensive Report',
      );
      await expect(page.locator('[data-testid="report-charts"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendations-section"]')).toBeVisible();

      // Print preview
      await page.click('[data-testid="print-preview"]');
      await expect(page.locator('[data-testid="print-dialog"]')).toBeVisible();
    });

    test('schedule automated reports', async ({ page }) => {
      await login(page, 'admin');

      // Navigate to report settings
      await page.click('[data-testid="nav-settings"]');
      await page.click('[data-testid="reports-settings"]');

      // Create new schedule
      await page.click('[data-testid="add-schedule"]');

      // Configure schedule
      await page.fill('[name="scheduleName"]', 'Weekly Progress Report');
      await page.selectOption('[name="frequency"]', 'weekly');
      await page.selectOption('[name="day"]', 'monday');
      await page.fill('[name="time"]', '09:00');

      // Select recipients
      await page.fill('[name="recipients"]', 'admin@school.edu, teacher@school.edu');

      // Save schedule
      await page.click('[data-testid="save-schedule"]');

      // Verify schedule created
      await expect(page.locator('[data-testid="schedule-list"]')).toContainText(
        'Weekly Progress Report',
      );
      await expect(page.locator('[data-testid="schedule-status"]')).toContainText('Active');
    });
  });

  test.describe('Data Visualization Journey', () => {
    test('interact with 3D visualizations', async ({ page }) => {
      await login(page);

      // Navigate to visualization page
      await page.click('[data-testid="nav-visualize"]');

      // Wait for 3D scene to load
      await page.waitForSelector('[data-testid="3d-canvas"]', { timeout: 15000 });

      // Interact with 3D controls
      await page.mouse.move(400, 300);
      await page.mouse.down();
      await page.mouse.move(500, 400);
      await page.mouse.up();

      // Change visualization type
      await page.selectOption('[name="vizType"]', 'network');
      await page.waitForFunction(() => {
        const canvas = document.querySelector('[data-testid="3d-canvas"]');
        return canvas?.getAttribute('data-viz-type') === 'network';
      });

      // Toggle settings
      await page.click('[data-testid="viz-settings"]');
      await page.check('[name="showLabels"]');
      await page.check('[name="animateTransitions"]');

      // Take screenshot
      await page.click('[data-testid="capture-viz"]');
      await expect(page.locator('[data-testid="screenshot-preview"]')).toBeVisible();
    });

    test('customize chart appearance', async ({ page }) => {
      await login(page);

      // Navigate to dashboard
      await page.click('[data-testid="nav-dashboard"]');

      // Open chart customization
      await page.click('[data-testid="chart-settings"]');

      // Change chart type
      await page.selectOption('[name="chartType"]', 'bar');

      // Customize colors
      await page.click('[data-testid="color-picker"]');
      await page.fill('[name="primaryColor"]', '#4A90E2');

      // Adjust axis settings
      await page.fill('[name="yAxisMin"]', '0');
      await page.fill('[name="yAxisMax"]', '100');

      // Apply changes
      await page.click('[data-testid="apply-chart-settings"]');

      // Verify changes applied
      await expect(page.locator('[data-testid="main-chart"]')).toHaveAttribute(
        'data-chart-type',
        'bar',
      );
    });
  });

  test.describe('Accessibility Journey', () => {
    test('navigate with keyboard only', async ({ page }) => {
      await login(page);

      // Tab through navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Verify navigation worked
      await expect(page).toHaveURL(/\/students/);

      // Navigate form with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space'); // Open dialog

      // Fill form with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.type('Keyboard User');
      await page.keyboard.press('Tab');
      await page.keyboard.type('12');

      // Submit with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Verify action completed
      await expect(page.locator('[role="alert"]')).toContainText('Success');
    });

    test('screen reader compatibility', async ({ page }) => {
      await login(page);

      // Check ARIA labels
      const navElement = page.locator('[role="navigation"]');
      await expect(navElement).toHaveAttribute('aria-label', /main navigation/i);

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);

      // Check form labels
      const inputs = await page.locator('input[type="text"], input[type="email"]').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        }
      }

      // Check live regions
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toHaveAttribute('aria-live', /polite|assertive/);
    });
  });

  test.describe('Error Handling Journey', () => {
    test('handle network errors gracefully', async ({ page }) => {
      await login(page);

      // Simulate network failure
      await page.route('**/api/**', (route) => route.abort());

      // Try to load data
      await page.click('[data-testid="nav-dashboard"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/unable to load/i);

      // Should offer retry
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Restore network and retry
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');

      // Should recover
      await expect(page.locator('[data-testid="analytics-chart"]')).toBeVisible();
    });

    test('validate form inputs', async ({ page }) => {
      await login(page);

      // Navigate to add student
      await page.click('[data-testid="nav-students"]');
      await page.click('[data-testid="add-student-btn"]');

      // Try to submit empty form
      await page.click('[type="submit"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="error-name"]')).toContainText(/required/i);

      // Enter invalid data
      await page.fill('[name="age"]', '-5');
      await page.fill('[name="email"]', 'invalid-email');

      // Should show specific errors
      await expect(page.locator('[data-testid="error-age"]')).toContainText(/must be positive/i);
      await expect(page.locator('[data-testid="error-email"]')).toContainText(/valid email/i);

      // Fix errors
      await page.fill('[name="name"]', 'Valid Name');
      await page.fill('[name="age"]', '10');
      await page.fill('[name="email"]', 'valid@email.com');

      // Should submit successfully
      await page.click('[type="submit"]');
      await expect(page.locator('[role="alert"]')).toContainText(/success/i);
    });
  });
});
