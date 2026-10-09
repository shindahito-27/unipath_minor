import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './styles.css';
import './auth.css';
import './resources.css';
import './timetable.css';
import './quiz.css';
import './portal.css';
import './analytics.css';
import './dark-mode.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider><NotificationProvider><App /></NotificationProvider></AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
