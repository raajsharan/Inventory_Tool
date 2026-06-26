import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

const ThemeContext = createContext(null);

const FONT_STEPS = [12, 13, 14, 15, 16, 17];     // ant default ~14
const DEFAULT_FONT_PX = 14;

const BASE_TOKEN = {
  colorPrimary: '#1f3a8a',
  colorInfo: '#1f3a8a',
  colorSuccess: '#16a34a',   // Active / installed / supported
  colorWarning: '#d97706',   // EOL-approaching / pending
  colorError:   '#dc2626',   // EOL / inactive / missing security tool
  colorLink:    '#2563eb',
  borderRadius: 6,
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyCode: '"JetBrains Mono", ui-monospace, monospace',
};

// Data-dense tuning shared by both themes: compact rows, quiet headers,
// navy-tinted row hover for fast scanning of large asset tables.
const DENSE_COMPONENTS = {
  Table: {
    cellPaddingBlock: 8,
    cellPaddingInline: 12,
    headerColor: '#64748b',
    rowHoverBg: 'rgba(31,58,138,0.06)',
  },
  Form: { itemMarginBottom: 16 },
  Descriptions: { itemPaddingBottom: 8 },
};

const LIGHT_COMPONENTS = {
  ...DENSE_COMPONENTS,
  Layout: { headerBg: '#ffffff', siderBg: '#0f1e4d', triggerBg: '#0b1740', bodyBg: '#f1f5f9' },
  Menu:   { darkItemBg: '#0f1e4d', darkSubMenuItemBg: '#0b1740', darkItemSelectedBg: '#1f3a8a' },
};

const DARK_COMPONENTS = {
  ...DENSE_COMPONENTS,
  Table:  { ...DENSE_COMPONENTS.Table, headerColor: '#94a3b8', rowHoverBg: 'rgba(96,165,250,0.12)' },
  Layout: { headerBg: '#141414', siderBg: '#000000', triggerBg: '#0a0a0a', bodyBg: '#1f1f1f' },
  Menu:   { darkItemBg: '#000000', darkSubMenuItemBg: '#0a0a0a', darkItemSelectedBg: '#1f3a8a' },
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [fontPx, setFontPx] = useState(() => {
    const v = parseInt(localStorage.getItem('themeFontPx') || '', 10);
    return Number.isFinite(v) && FONT_STEPS.includes(v) ? v : DEFAULT_FONT_PX;
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
    document.body.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('themeFontPx', String(fontPx));
    // Also expose as a CSS variable for any non-AntD bits.
    document.documentElement.style.setProperty('--app-font-px', `${fontPx}px`);
  }, [fontPx]);

  const config = useMemo(() => ({
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: { ...BASE_TOKEN, fontSize: fontPx },
    components: mode === 'dark' ? DARK_COMPONENTS : LIGHT_COMPONENTS,
  }), [mode, fontPx]);

  function toggleMode() { setMode(m => m === 'dark' ? 'light' : 'dark'); }
  function increaseFont() {
    setFontPx(p => {
      const i = FONT_STEPS.indexOf(p);
      return FONT_STEPS[Math.min(FONT_STEPS.length - 1, i + 1)];
    });
  }
  function decreaseFont() {
    setFontPx(p => {
      const i = FONT_STEPS.indexOf(p);
      return FONT_STEPS[Math.max(0, i - 1)];
    });
  }
  function resetFont() { setFontPx(DEFAULT_FONT_PX); }

  const canIncrease = fontPx < FONT_STEPS[FONT_STEPS.length - 1];
  const canDecrease = fontPx > FONT_STEPS[0];

  return (
    <ThemeContext.Provider value={{
      mode, toggleMode,
      fontPx, increaseFont, decreaseFont, resetFont,
      canIncrease, canDecrease,
    }}>
      <ConfigProvider theme={config}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
