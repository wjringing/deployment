// KFC-branded Ant Design theme configuration
export const antdTheme = {
  token: {
    // Brand colors - KFC Red
    colorPrimary: '#DC2626',
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',

    // Typography
    fontSize: 16,
    fontSizeSM: 14,
    fontSizeLG: 18,
    fontSizeXL: 20,
    fontSizeHeading1: 36,
    fontSizeHeading2: 28,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 18,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Border radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Layout
    colorBgLayout: '#F9FAFB',
    colorBgContainer: '#FFFFFF',

    // Component specific
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,

    // Shadows
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#374151',
      itemHoverColor: '#DC2626',
      itemHoverBg: '#FEE2E2',
      itemSelectedColor: '#DC2626',
      itemSelectedBg: '#FEE2E2',
      itemActiveBg: '#FEF2F2',
      horizontalItemHoverColor: '#DC2626',
      horizontalItemSelectedColor: '#DC2626',
      iconSize: 16,
    },
    Button: {
      primaryColor: '#FFFFFF',
      colorPrimary: '#DC2626',
      colorPrimaryHover: '#B91C1C',
      colorPrimaryActive: '#991B1B',
      defaultBorderColor: '#D1D5DB',
      defaultColor: '#374151',
      dangerColor: '#EF4444',
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      fontSize: 16,
      fontSizeLG: 18,
      fontSizeSM: 14,
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
    Table: {
      headerBg: '#F9FAFB',
      headerColor: '#111827',
      borderColor: '#E5E7EB',
      rowHoverBg: '#FEF2F2',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
      fontSize: 16,
      colorBorder: '#D1D5DB',
      colorPrimaryHover: '#DC2626',
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
      fontSize: 16,
      colorBorder: '#D1D5DB',
      colorPrimaryHover: '#DC2626',
    },
    Tabs: {
      itemColor: '#6B7280',
      itemHoverColor: '#DC2626',
      itemSelectedColor: '#DC2626',
      itemActiveColor: '#DC2626',
      inkBarColor: '#DC2626',
    },
    Badge: {
      colorError: '#EF4444',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Drawer: {
      borderRadiusLG: 12,
    },
  },
};
