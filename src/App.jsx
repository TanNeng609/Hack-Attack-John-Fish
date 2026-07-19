import React, { useState, useEffect, useRef } from 'react';
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
  const [showNotifications, setShowNotifications] = useState(false);
  
  const bellRef = useRef(null);

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

  // Remediation action queue lives here (like alerts) so every page can
  // escalate real incidents into the Remediation Center instead of the
  // center showing a static, disconnected list.
  const [remediationActions, setRemediationActions] = useState([
    {
      id: 2,
      title: "Isolate Network Gateway: Payment API Split",
      confidence: 89,
      risk: "HIGH",
      type: "warning",
      reason: "Unusual traffic burst detected on payment gateway endpoint.",
      status: "Pending Approval"
    },
    {
      id: 3,
      title: "Flush Redis Cache & Restart Cluster",
      confidence: 99,
      risk: "MEDIUM",
      type: "primary",
      reason: "Memory fragmentation in Redis cluster exceeding 85% capacity.",
      status: "Pending Approval"
    }
  ]);

  const addRemediationAction = (action) => {
    setRemediationActions(prev => {
      // Don't stack duplicate pending actions for the same incident
      if (prev.some(a => a.title === action.title && a.status === 'Pending Approval')) return prev;
      return [{ id: Date.now(), status: 'Pending Approval', ...action }, ...prev];
    });
  };

  // Handle application theme toggling
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Handle click outside notifications dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            
            {/* Interactive Bell Container */}
            <div className="alert-bell" ref={bellRef}>
              <i 
                className="fa-solid fa-bell" 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ cursor: 'pointer' }}
              ></i>
              {activeAlertsCount > 0 && (
                <span 
                  className="badge-count"
                  onClick={() => setShowNotifications(!showNotifications)}
                  style={{ cursor: 'pointer' }}
                >
                  {activeAlertsCount}
                </span>
              )}

              {/* Dropdown Menu */}
              {showNotifications && (
                <div className="notifications-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-header">
                    <span>Notifications</span>
                    {alerts.length > 0 && (
                      <button 
                        className="dropdown-clear-btn"
                        onClick={() => {
                          setAlerts([]);
                          setShowNotifications(false);
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="dropdown-list">
                    {alerts.length === 0 ? (
                      <div className="dropdown-empty">
                        <i className="fa-regular fa-bell-slash" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}></i>
                        <span>No new notifications</span>
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <div key={alert.id} className="dropdown-item">
                          <div className={`dropdown-item-icon ${alert.type === 'danger' ? 'danger' : alert.type === 'warning' ? 'warning' : 'success'}`}>
                            <i className={
                              alert.type === 'danger' 
                                ? 'fa-solid fa-circle-exclamation' 
                                : alert.type === 'warning' 
                                  ? 'fa-solid fa-triangle-exclamation' 
                                  : 'fa-solid fa-circle-check'
                            }></i>
                          </div>
                          <div className="dropdown-item-content">
                            <span className="dropdown-item-title">{alert.title}</span>
                            <span className="dropdown-item-desc" dangerouslySetInnerHTML={{ __html: alert.desc }}></span>
                            <span className="dropdown-item-time">{alert.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="content-body">
          {/* Simple state-based router */}
          {activeTab === 'overview' && (
            <Overview alerts={alerts} setAlerts={setAlerts} />
          )}
          {activeTab === 'it-prediction' && <ITPrediction setActiveTab={setActiveTab} addRemediationAction={addRemediationAction} />}
          {activeTab === 'financial-risk' && <FinancialRisk addRemediationAction={addRemediationAction} />}
          {activeTab === 'remediation' && <Remediation actions={remediationActions} setActions={setRemediationActions} />}
          {activeTab === 'hardware-degradation' && <HardwareDegradation setActiveTab={setActiveTab} setAlerts={setAlerts} addRemediationAction={addRemediationAction} />}
          {activeTab === 'settings' && <Settings theme={theme} setTheme={setTheme} />}
        </div>
        
        {/* Continuous baseline connection footer - CRITICAL BUSINESS COMPLIANCE */}
        <footer style={{
          marginTop: 'auto',
          padding: '0.75rem 1.5rem',
          background: 'rgba(10, 15, 30, 0.4)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            AegisAI Engine: <span style={{ color: 'var(--color-success)', fontWeight: '600' }}><i className="fa-solid fa-circle-check"></i> ONLINE</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>MySQL DB Cluster: <span style={{ color: 'var(--color-success)' }}>Connected (0.8ms query latency)</span></span>
            <span>PyTorch Inference Model: <span style={{ color: '#00f2fe' }}>v2.4.1-active</span></span>
            <span>Edge Gateway Region: <span style={{ color: '#94a3b8' }}>AP-Southeast-1 (Kuala Lumpur)</span></span>
          </div>
        </footer>
      </main>
    </div>
  );
}
