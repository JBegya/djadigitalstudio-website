/**
 * Single source of truth for every DJ&A Digital Studio app.
 *
 * To add a new app: copy an existing 'draft' entry, fill in the fields, and
 * change status to 'live' when you're ready to launch. Run `node build.js`
 * afterwards and commit the generated files. See ARCHITECTURE.md.
 *
 * status:
 *   'draft'   — config only. No pages, no sitemap entry, no nav link, no
 *               public footprint at all. Use this for anything unannounced.
 *   'live'    — full landing page + privacy + terms + nav card + sitemap +
 *               structured data, generated fresh on every build.
 *   'retired' — privacy/terms stay published (existing users still need
 *               them and app stores still link to them) but the app is
 *               dropped from nav/homepage/support grids and gets a plain
 *               "no longer available" landing page instead of marketing copy.
 */

const COMPANY = {
  legalName: 'DJ&A Digital Studio Limited',
  tradingName: 'DJ&A Digital Studio',
  country: 'New Zealand',
  // Only reference mailboxes that actually exist. Currently: jennie@, hello@, support@, admin@
  supportEmail: 'support@djadigitalstudio.com',
  adminEmail: 'admin@djadigitalstudio.com',
  helloEmail: 'hello@djadigitalstudio.com',
  siteUrl: 'https://djadigitalstudio.com',
};

const APPS = [
  {
    id: 'splitshift-hours',
    status: 'live',
    name: 'SplitShift Hours',
    accent: 'gold', // 'gold' | 'rose' — which brand accent this app's pages use
    tagline: 'Track shifts,<br>hours &amp;<br><em>pay.</em>',
    heroSub: "The shift worker's timesheet. Log shifts from multiple jobs, track against any pay cycle, and export clean PDF timesheets — all stored privately on your device. No account. No cloud. No nonsense.",
    homeCardDesc: 'Track shifts from multiple jobs, log hours against any pay cycle, and export PDF timesheets — all stored privately on your device.',
    metaTitle: 'SplitShift Hours — Track Shifts, Hours & Pay',
    metaDescription: "SplitShift Hours is the shift worker's timesheet. Track shifts from multiple jobs, log hours, and export PDF timesheets — all stored privately on your device.",
    // Store links confirmed broken in a real browser on 13 July 2026 — both
    // the App Store id and every Play Store package id on file return
    // "not found" (verified against known-good controls, so this isn't a
    // bot-blocking false positive). Kept here for whenever the listing goes
    // live; storeLinksLive:false below hides the buttons in the meantime.
    appStoreUrl: 'https://apps.apple.com/app/splitshift-hours/id6785191817',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.splitshift.app.hours',
    storeLinksLive: false, // set true once the App Store / Play Store listing actually resolves
    structuredDataCategory: 'BusinessApplication',
    // Metadata for future press kits / App Store Connect cross-checks — not
    // yet consumed by build.js beyond the URLs above, but kept as the single
    // source of truth so nothing has to be re-derived by hand later.
    appStoreId: '6785191817',
    androidPackageId: 'com.splitshift.app.hours', // matches app.json bundleIdentifier/package — no discrepancy
    iosBundleId: 'com.splitshift.app.hours',
    currentVersion: '1.0.0', // from app.json — update when you ship a new version
    releaseStatus: 'Live on iOS & Android',
    supportEmail: COMPANY.supportEmail, // per-app override point; unused for now, both apps share the company inbox
    privacyUrl: '/privacy/splitshift-hours/',
    termsUrl: '/terms/splitshift-hours/',
    appIcon: null, // pending — drop a 1024x1024 app icon PNG in brand/ and reference it here
    heroImage: null, // pending — for a future og:image / press-kit hero shot
    features: [
      { name: 'Multiple Jobs', desc: 'Track shifts across multiple jobs separately — each with its own calendar, pay period, and hours tally.' },
      { name: 'Shift Templates', desc: 'Save your common shift patterns as templates and log shifts in seconds — no typing the same details every day.' },
      { name: 'PDF Timesheets', desc: 'Export a clean, professional timesheet PDF ready to email to your employer or payroll team.' },
      { name: 'Pay Period Reports', desc: 'View hours and earnings by pay period, week, month, or year — with a clear breakdown per job.' },
      { name: 'Flexible Pay Cycles', desc: 'Set your own pay period start — weekly, fortnightly, semi-monthly, or monthly — for any currency.' },
      { name: 'Offline First', desc: 'Works completely offline. Your data stays on your device — never uploaded to any server.' },
    ],
    faqs: [
      { q: 'How much does SplitShift Hours cost?', a: 'SplitShift Hours is available as a subscription — monthly or annual. You can manage your subscription through your Apple ID or Google Play account.' },
      { q: 'Where is my data stored?', a: 'All your shifts, jobs, and settings are stored locally on your device. Your data is never uploaded to our servers.' },
      { q: 'How do I cancel my subscription?', a: 'Manage your subscription through your Apple ID (Settings → Your Name → Subscriptions) or Google Play account settings. Cancel at least 24 hours before your renewal date to avoid being charged for the next period.' },
      { q: 'My subscription isn\'t being recognised after reinstalling. What do I do?', a: 'Open the app and tap "Restore Purchases" on the paywall screen. Make sure you\'re signed in with the same Apple ID or Google account you used to subscribe.' },
      { q: 'Which countries are supported?', a: 'New Zealand, Australia, UK, USA, Canada, Philippines, Japan, Singapore, Taiwan, Germany, UAE, Saudi Arabia, Kuwait, Qatar, Timor-Leste, and Other (custom currency).' },
    ],
    privacy: {
      effectiveDate: '1 June 2026',
      sections: [
        { h: '1. Overview', p: [
          `SplitShift Hours is developed and operated by ${COMPANY.legalName} ("${COMPANY.tradingName}", "we", "our", or "us"). This Privacy Policy explains how we handle information in connection with the SplitShift Hours mobile application ("the App").`,
          'We take your privacy seriously. SplitShift Hours is designed to work with your data stored locally on your device. We do not operate servers that store your personal shift or pay data.',
        ]},
        { h: '2. Data We Do Not Collect', p: [
          'SplitShift Hours does not collect, transmit, or store the following on our servers:',
        ], ul: [
          'Your shift times, hours worked, or pay calculations',
          'Your hourly rate, salary, or income information',
          'Your employer, department, or employee ID',
          'Your name or contact information (unless you contact us directly)',
          'Your location data',
          'Your shift templates or saved job details',
        ], pAfter: [
          'All shift, job, and pay data you enter in the App is stored locally on your device and is never transmitted to our servers.',
        ]},
        { h: '3. Data Collected by Third Parties', p: [
          'SplitShift Hours uses RevenueCat to manage in-app subscriptions. When you purchase or restore a subscription, RevenueCat may collect:',
        ], ul: [
          'Your Apple ID or Google account identifier (anonymised)',
          'Purchase transaction identifiers',
          'Subscription status and entitlement information',
          'Device type and operating system version',
        ], pAfter: [
          'This data is used solely to verify and manage your subscription. RevenueCat\'s privacy practices are governed by their own Privacy Policy, available at <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener">revenuecat.com/privacy</a>.',
          'Apple and Google may also collect data in connection with App Store and Google Play purchases in accordance with their respective privacy policies.',
        ]},
        { h: '4. Push Notifications', p: [
          'SplitShift Hours may request permission to send you push notifications as shift reminders. If you grant this permission, your device token is used only to deliver notifications to your device. We do not use notification tokens to identify you or link them to any personal data. You can disable notifications at any time in your device settings.',
        ]},
        { h: '5. PDF Exports', p: [
          "When you export a PDF timesheet, the document is generated locally on your device. The App uses your device's native share sheet to save or send the PDF. We do not receive, store, or process the content of your exported timesheets.",
        ]},
        { h: '6. Communications', p: [
          `If you contact us at <a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a>, we will use the information you provide (such as your name and email address) solely to respond to your enquiry. We do not add you to any mailing list or share your contact details with third parties.`,
        ]},
        { h: "7. Children's Privacy", p: [
          'SplitShift Hours is intended for use by adults aged 18 and over. We do not knowingly collect personal information from children under the age of 13. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.',
        ]},
        { h: '8. Data Security', p: [
          "Because your shift and pay data is stored locally on your device, its security is governed by your device's own security settings (screen lock, encryption, etc.). We recommend keeping your device software up to date and using a secure lock screen passcode.",
        ]},
        { h: '9. Changes to This Policy', p: [
          'We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. Continued use of the App after any changes constitutes your acceptance of the updated policy. We encourage you to review this page periodically.',
        ]},
      ],
    },
    terms: {
      effectiveDate: '1 June 2026',
      sections: [
        { h: '1. Acceptance of Terms', p: [
          `By downloading, installing, or using SplitShift Hours ("the App"), you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the App. These Terms constitute a legal agreement between you and ${COMPANY.legalName} ("${COMPANY.tradingName}", "we", "our", or "us").`,
        ]},
        { h: '2. Licence', p: [
          'We grant you a limited, non-exclusive, non-transferable, revocable licence to use the App for your personal, non-commercial purposes on devices you own or control, subject to these Terms and applicable App Store or Google Play terms.',
          'You may not copy, modify, distribute, sell, or lease any part of the App, nor may you reverse engineer or attempt to extract the source code of the App.',
        ]},
        { h: '3. Subscriptions', p: [
          'SplitShift Hours is available as a subscription on a monthly or annual basis, managed through Apple App Store or Google Play.',
        ], ul: [
          'Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period',
          'You can manage or cancel your subscription in your App Store or Google Play account settings',
          'No refunds are provided for unused portions of a subscription period, except as required by applicable law',
          'Prices may change with reasonable notice',
        ]},
        { h: '4. Accuracy of Records', p: [
          'SplitShift Hours provides hours tallies and pay summaries as a convenience tool based on the shifts and rates you enter. These figures are indicative only and should not be relied upon as authoritative payroll records.',
          'Always verify your hours and pay against your employer\'s payslip. We accept no liability for any loss or damage resulting from reliance on figures produced by the App.',
        ]},
        { h: '5. Your Data', p: [
          'All data you enter into the App (shifts, pay rates, job details, shift templates) is stored locally on your device. We do not have access to your data. You are solely responsible for maintaining backups of your data. We are not liable for any loss of data resulting from device failure, App updates, or any other cause.',
        ]},
        { h: '6. Prohibited Use', p: [
          'You agree not to use the App:',
        ], ul: [
          'In any way that violates applicable local, national, or international law or regulation',
          'To transmit any unsolicited or unauthorised advertising or promotional material',
          'To attempt to gain unauthorised access to any part of the App or its related systems',
          'In any way that could damage, disable, or impair the App',
        ]},
        { h: '7. Intellectual Property', p: [
          `The App and its original content, features, and functionality are and will remain the exclusive property of ${COMPANY.legalName}. The App is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of ${COMPANY.legalName}.`,
        ]},
        { h: '8. Disclaimer of Warranties', p: [
          'The App is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the App will be uninterrupted, error-free, or free of viruses or other harmful components.',
        ]},
        { h: '9. Limitation of Liability', p: [
          `To the fullest extent permitted by applicable law, ${COMPANY.legalName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the App.`,
        ]},
        { h: '10. Changes to These Terms', p: [
          'We reserve the right to modify these Terms at any time. We will update the effective date at the top of this page when changes are made. Your continued use of the App after any changes constitutes your acceptance of the revised Terms.',
        ]},
        { h: '11. Governing Law', p: [
          `These Terms shall be governed by and construed in accordance with the laws of ${COMPANY.country}, without regard to its conflict of law provisions. ${COMPANY.legalName} is a company incorporated in ${COMPANY.country}.`,
        ]},
      ],
    },
  },

  {
    id: 'shiftearn-pro',
    status: 'live',
    name: 'ShiftEarn Pro',
    accent: 'rose',
    tagline: "Know exactly<br>what you've<br><em>earned.</em>",
    heroSub: 'Calculate your exact take-home pay for every shift — penalty rates, overtime, tax, KiwiSaver, leave and more. Built for shift workers across 15+ countries. All stored privately on your device.',
    homeCardDesc: 'Calculate your exact take-home pay for every shift — penalty rates, overtime, tax, and leave — across 15+ countries.',
    metaTitle: 'ShiftEarn Pro — Pay Calculator & Shift Tracker',
    metaDescription: 'ShiftEarn Pro calculates your exact take-home pay for every shift — penalty rates, tax, overtime and more. Built for shift workers in NZ, AU, UK, US and beyond.',
    appStoreUrl: 'https://apps.apple.com/app/shiftearn-pro/id6774583921',
    // ⚠️ UNVERIFIED DISCREPANCY: this Play Store URL uses package id
    // "com.shiftearnpro.app", but the ShiftEarn Pro repo's app.json has
    // "com.djadigital.shiftEarnPro" in every commit in its git history —
    // the two have never matched here. Android package IDs can't change
    // after first publish, so one of these is wrong. Verify which one is
    // actually live in Google Play Console before trusting either — I
    // can't check Play Console myself. Left this URL as-is (unchanged from
    // what was already live) rather than guess.
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.shiftearnpro.app',
    structuredDataCategory: 'FinanceApplication',
    price: { amount: '7.99', currency: 'USD' },
    appStoreId: '6774583921',
    androidPackageId: 'com.djadigital.shiftEarnPro', // from app.json — see discrepancy note above
    iosBundleId: 'com.djadigital.shiftEarnPro',
    currentVersion: '1.0.0', // from app.json — update when you ship a new version
    releaseStatus: 'Live on iOS & Android',
    supportEmail: COMPANY.supportEmail,
    privacyUrl: '/privacy/shiftearn-pro/',
    termsUrl: '/terms/shiftearn-pro/',
    appIcon: null, // pending — drop a 1024x1024 app icon PNG in brand/ and reference it here
    heroImage: null, // pending — for a future og:image / press-kit hero shot
    features: [
      { name: 'Pay Calculator', desc: 'Penalty rates, overtime, tax, and deductions calculated accurately for your country and employment type.' },
      { name: 'FIFO Roster', desc: 'Full fly-in fly-out roster support with annualised pay calculations and per-day override.' },
      { name: 'Leave Calculator', desc: 'Track annual, sick, long service, and shift leave balances. NZ and AU statutory entitlements built in.' },
      { name: 'Multiple Jobs', desc: 'Job 1, Job 2, and secondary role — each tracked independently with its own pay settings and tax.' },
      { name: 'PDF Timesheets', desc: 'Export professional PDF timesheets with full shift detail and pay summary.' },
      { name: '15+ Countries', desc: 'NZ, AU, UK, US, CA, PH, JP, SG, UAE, SA, KW, QA, TL and more. Custom currency supported.' },
    ],
    faqs: [
      { q: 'How much does ShiftEarn Pro cost?', a: 'ShiftEarn Pro is available as a subscription — monthly or annual. You can manage your subscription through your Apple ID or Google Play account.' },
      { q: 'How accurate are the pay calculations?', a: 'Calculations are based on the settings you enter and are designed to be a close estimate of your take-home pay. Always verify against your payslip. Tax rates and award rates change — check your settings are current.' },
      { q: 'Where is my data stored?', a: 'All data is stored locally on your device. We never upload your pay or shift data to any server.' },
      { q: 'How do I cancel my subscription?', a: 'Manage your subscription through your Apple ID settings or Google Play account. Cancel at least 24 hours before renewal to avoid being charged.' },
      { q: "My subscription isn't being recognised. What do I do?", a: 'Tap "Restore Purchases" on the paywall screen. Make sure you\'re signed in with the same Apple ID or Google account you used to subscribe.' },
    ],
    privacy: {
      effectiveDate: '1 June 2026',
      sections: [
        { h: '1. Overview', p: [
          `ShiftEarn Pro is developed and operated by ${COMPANY.legalName} ("${COMPANY.tradingName}", "we", "our", or "us"). This Privacy Policy explains how we handle information in connection with the ShiftEarn Pro mobile application ("the App").`,
          'We take your privacy seriously. ShiftEarn Pro is designed to work with your data stored locally on your device. We do not operate servers that store your personal pay or shift data.',
        ]},
        { h: '2. Data We Do Not Collect', p: [
          'ShiftEarn Pro does not collect, transmit, or store the following on our servers:',
        ], ul: [
          'Your shift times, hours worked, or pay calculations',
          'Your hourly rate, salary, or income information',
          'Your tax settings, deductions, or KiwiSaver rate',
          'Your employer, department, or employee ID',
          'Your name or contact information (unless you contact us directly)',
          'Your location data',
          'Your leave balances or FIFO roster patterns',
        ], pAfter: [
          'All shift, pay, and employee data you enter in the App is stored locally on your device and is never transmitted to our servers.',
        ]},
        { h: '3. Data Collected by Third Parties', p: [
          'ShiftEarn Pro uses RevenueCat to manage in-app subscriptions. When you purchase or restore a subscription, RevenueCat may collect:',
        ], ul: [
          'Your Apple ID or Google account identifier (anonymised)',
          'Purchase transaction identifiers',
          'Subscription status and entitlement information',
          'Device type and operating system version',
        ], pAfter: [
          'This data is used solely to verify and manage your subscription. RevenueCat\'s privacy practices are governed by their own Privacy Policy, available at <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener">revenuecat.com/privacy</a>.',
          'Apple and Google may also collect data in connection with App Store and Google Play purchases in accordance with their respective privacy policies.',
        ]},
        { h: '4. PDF Exports', p: [
          "When you export a PDF timesheet, the document is generated locally on your device. The App uses your device's native share sheet to save or send the PDF. We do not receive, store, or process the content of your exported timesheets.",
        ]},
        { h: '5. Communications', p: [
          `If you contact us at <a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a>, we will use the information you provide (such as your name and email address) solely to respond to your enquiry. We do not add you to any mailing list or share your contact details with third parties.`,
        ]},
        { h: "6. Children's Privacy", p: [
          'ShiftEarn Pro is intended for use by adults aged 18 and over. We do not knowingly collect personal information from children under the age of 13. If you believe a child has provided us with personal information, please contact us and we will promptly delete it.',
        ]},
        { h: '7. Data Security', p: [
          "Because your shift and pay data is stored locally on your device, its security is governed by your device's own security settings (screen lock, encryption, etc.). We recommend keeping your device software up to date and using a secure lock screen passcode.",
        ]},
        { h: '8. Changes to This Policy', p: [
          'We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. Continued use of the App after any changes constitutes your acceptance of the updated policy.',
        ]},
      ],
    },
    terms: {
      effectiveDate: '1 June 2026',
      sections: [
        { h: '1. Acceptance of Terms', p: [
          `By downloading, installing, or using ShiftEarn Pro ("the App"), you agree to be bound by these Terms of Use. If you do not agree to these terms, do not use the App. These Terms constitute a legal agreement between you and ${COMPANY.legalName} ("${COMPANY.tradingName}", "we", "our", or "us").`,
        ]},
        { h: '2. Licence', p: [
          'We grant you a limited, non-exclusive, non-transferable, revocable licence to use the App for your personal, non-commercial purposes on devices you own or control, subject to these Terms and applicable App Store or Google Play terms.',
          'You may not copy, modify, distribute, sell, or lease any part of the App, nor may you reverse engineer or attempt to extract the source code of the App.',
        ]},
        { h: '3. Subscriptions', p: [
          'ShiftEarn Pro is available as a subscription on a monthly or annual basis, managed through Apple App Store or Google Play.',
        ], ul: [
          'Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period',
          'You can manage or cancel your subscription in your App Store or Google Play account settings',
          'No refunds are provided for unused portions of a subscription period, except as required by applicable law',
          'Prices may change with reasonable notice',
        ]},
        { h: '4. Accuracy of Calculations', p: [
          'ShiftEarn Pro provides pay estimates, tax figures, and leave calculations as a convenience tool based on information you enter. These figures are indicative only and should not be relied upon as legally or financially authoritative. Tax laws, award rates, and employment conditions change frequently and vary by jurisdiction.',
          "Always verify your pay with your employer's payslip and consult a qualified accountant or employment advisor for matters relating to your actual pay, tax obligations, or entitlements.",
          'We accept no liability for any loss or damage resulting from reliance on calculations produced by the App.',
        ]},
        { h: '5. Your Data', p: [
          'All data you enter into the App (shifts, pay rates, tax settings, leave balances, employee details) is stored locally on your device. We do not have access to your data. You are solely responsible for maintaining backups of your data. We are not liable for any loss of data resulting from device failure, App updates, or any other cause.',
        ]},
        { h: '6. Prohibited Use', p: [
          'You agree not to use the App:',
        ], ul: [
          'In any way that violates applicable local, national, or international law or regulation',
          'To transmit any unsolicited or unauthorised advertising or promotional material',
          'To attempt to gain unauthorised access to any part of the App or its related systems',
          'In any way that could damage, disable, or impair the App',
        ]},
        { h: '7. Intellectual Property', p: [
          `The App and its original content, features, and functionality are and will remain the exclusive property of ${COMPANY.legalName}. The App is protected by copyright, trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of ${COMPANY.legalName}.`,
        ]},
        { h: '8. Disclaimer of Warranties', p: [
          'The App is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.',
        ]},
        { h: '9. Limitation of Liability', p: [
          `To the fullest extent permitted by applicable law, ${COMPANY.legalName} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the App.`,
        ]},
        { h: '10. Changes to These Terms', p: [
          'We reserve the right to modify these Terms at any time. We will update the effective date at the top of this page when changes are made. Your continued use of the App after any changes constitutes your acceptance of the revised Terms.',
        ]},
        { h: '11. Governing Law', p: [
          `These Terms shall be governed by and construed in accordance with the laws of ${COMPANY.country}, without regard to its conflict of law provisions. ${COMPANY.legalName} is a company incorporated in ${COMPANY.country}.`,
        ]},
      ],
    },
  },

  // --- Draft apps: config only. No pages are generated for these at all. ---
  {
    id: 'shiftfamily-calendar', status: 'draft', name: 'ShiftFamily Calendar',
    appStoreId: null, androidPackageId: null, iosBundleId: null,
    currentVersion: null, releaseStatus: 'In development',
    supportEmail: COMPANY.supportEmail, appIcon: null, heroImage: null,
  },
  {
    id: 'shifthydrate', status: 'draft', name: 'ShiftHydrate',
    appStoreId: null, androidPackageId: null, iosBundleId: null,
    currentVersion: null, releaseStatus: 'In development',
    supportEmail: COMPANY.supportEmail, appIcon: null, heroImage: null,
  },
];

module.exports = { COMPANY, APPS };
