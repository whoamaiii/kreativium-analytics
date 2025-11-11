import 'react-i18next';

import common from '@/locales/en/common.json';
import dashboard from '@/locales/en/dashboard.json';
import student from '@/locales/en/student.json';
import tracking from '@/locales/en/tracking.json';
import analytics from '@/locales/en/analytics.json';
import settings from '@/locales/en/settings.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      dashboard: typeof dashboard;
      student: typeof student;
      tracking: typeof tracking;
      analytics: typeof analytics;
      settings: typeof settings;
    };
  }
}
