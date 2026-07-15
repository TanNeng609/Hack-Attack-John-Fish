import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo">Æ</div>
        <div className="brand-name">AegisAI</div>
      </div>
      
      <nav className="menu-section">
        <button 
          className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fa-solid fa-chart-line"></i>
          <span>Overview</span>
        </button>
        <button 
          className={`menu-item ${activeTab === 'it-prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('it-prediction')}
        >
          <i className="fa-solid fa-server"></i>
          <span>IT Prediction</span>
        </button>
        <button 
          className={`menu-item ${activeTab === 'financial-risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial-risk')}
        >
          <i className="fa-solid fa-shield-halved"></i>
          <span>Financial Risk</span>
        </button>
        <button 
          className={`menu-item ${activeTab === 'remediation' ? 'active' : ''}`}
          onClick={() => setActiveTab('remediation')}
        >
          <i className="fa-solid fa-terminal"></i>
          <span>Remediation</span>
        </button>
        <button 
          className={`menu-item ${activeTab === 'business-strategy' ? 'active' : ''}`}
          onClick={() => setActiveTab('business-strategy')}
        >
          <i className="fa-solid fa-briefcase"></i>
          <span>Business Strategy</span>
        </button>
      </nav>
      
      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-label">Engine Status:</span>
          <span className="status-indicator">
            <span className="status-dot"></span>
            <span>Active</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
