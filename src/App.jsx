import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import ITPrediction from './components/ITPrediction';
import FinancialRisk from './components/FinancialRisk';
import Remediation from './components/Remediation';
import HardwareDegradation from './components/HardwareDegradation';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timestamp, setTimestamp] = useState('');
  const [theme, setTheme] = useState('dark');
  
  // Lift alert state globally to share active alerts count with top-nav header
  const [alerts, setAlerts] = useState([
    {
      id: 'alert-init',
      type: 'success',
      tag: 'System',
      time: 'Just Now',
      title: 'Predictive Engine Initiated',
      desc: 'Ingesting server logs and telemetry streams successfully.',
      xai: 'Predictive modules successfully registered. Listening to microservices CPU, IOPS, and network queues.',
      expanded: false
    }
  ]);

  // Handle application theme toggling
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const current = new Date();
      setTimestamp(current.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute active page title
  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview': return 'System Overview Dashboard';
      case 'it-prediction': return 'IT Incident Prediction';
      case 'financial-risk': return 'Financial Risk & Fraud';
      case 'remediation': return 'Automated Remediation';
      case 'hardware-degradation': return 'Hardware Degradation';
      case 'settings': return 'System Settings';
      default: return 'Dashboard';
    }
  };

  const activeAlertsCount = alerts.filter(a => a.type === 'danger').length;

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content shell */}
      <main className="main-content">
        <header className="top-nav">
          <h1 className="page-title">{getPageTitle()}</h1>
          <div className="nav-actions">
            <div className="live-time">{timestamp}</div>
            <div className="alert-bell">
              <i className="fa-solid fa-bell"></i>
              {activeAlertsCount > 0 && (
                <span className="badge-count">{activeAlertsCount}</span>
              )}
            </div>
          </div>
        </header>

        <div className="content-body">
          {/* Simple state-based router */}
          {activeTab === 'overview' && (
            <Overview alerts={alerts} setAlerts={setAlerts} />
          )}
          {activeTab === 'it-prediction' && <ITPrediction />}
          {activeTab === 'financial-risk' && <FinancialRisk />}
          {activeTab === 'remediation' && <Remediation />}
          {activeTab === 'hardware-degradation' && <HardwareDegradation />}
          {activeTab === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
        </div>
      </main>
    </div>
  );
}
