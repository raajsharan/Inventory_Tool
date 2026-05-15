import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import 'antd/dist/reset.css';
import './styles.css';

const theme = {
  token: {
    colorPrimary: '#1f3a8a',
    colorInfo: '#1f3a8a',
    borderRadius: 6,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    Layout: { headerBg: '#ffffff', siderBg: '#0f1e4d', triggerBg: '#0b1740' },
    Menu: { darkItemBg: '#0f1e4d', darkSubMenuItemBg: '#0b1740', darkItemSelectedBg: '#1f3a8a' },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
