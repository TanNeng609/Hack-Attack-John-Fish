import React, { useState } from 'react';

export default function Settings({ theme, setTheme }) {
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState('2.5s');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000); // Reset saved status after 3 seconds
  };

  return (
    <div className="card-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="panel-header">
        <div>
          <h3 className="panel-title">
            <i className="fa-solid fa-sliders" style={{ color: 'var(--color-primary)' }}></i> AegisAI System Settings
          </h3>
          <p className="panel-subtitle">Configure application thresholds, monitoring intervals, and UI themes</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSave}>
        
        {/* Toggle Theme Control (Core requirement) */}
        <div className="form-group">
          <label className="form-label">Application Interface Theme</label>
          <div 
            className={`form-control-toggle ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <div className="form-toggle-switch"></div>
            <span className="form-toggle-label">
              {theme === 'dark' ? 'Dark Theme (Active)' : 'Light Theme (Active)'}
            </span>
          </div>
        </div>

        {/* Toggle Alert Simulation */}
        <div className="form-group">
          <label className="form-label">Telemetry Alert Ingestion</label>
          <div 
            className={`form-control-toggle ${alertsEnabled ? 'active' : ''}`}
            onClick={() => setAlertsEnabled(!alertsEnabled)}
          >
            <div className="form-toggle-switch"></div>
            <span className="form-toggle-label">
              {alertsEnabled ? 'Predictive Warnings Enabled' : 'Predictive Warnings Muted'}
            </span>
          </div>
        </div>

        {/* Telemetry Refresh Speed */}
        <div className="form-group">
          <label className="form-label">Telemetry Sampling Interval</label>
          <select 
            className="form-select"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(e.target.value)}
          >
            <option value="1s">High Frequency (1.0s ticks)</option>
            <option value="2.5s">Standard (2.5s ticks)</option>
            <option value="5s">Eco-Mode (5.0s ticks)</option>
          </select>
        </div>

        {/* Save Confirmation Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
          <button type="submit" className="btn-submit">
            Save Settings
          </button>
          {isSaved && (
            <span style={{ color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: '600', animation: 'fadeIn 0.3s ease' }}>
              <i className="fa-solid fa-circle-check"></i> Configurations saved successfully!
            </span>
          )}
        </div>

      </form>
    </div>
  );
}
