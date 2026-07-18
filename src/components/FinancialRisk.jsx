import React, { useState, useEffect, useCallback } from 'react';

const MOCK_LOCATIONS = ['New York, US', 'London, UK', 'Tokyo, JP', 'Sydney, AU', 'Berlin, DE', 'Toronto, CA', 'Singapore, SG', 'Frankfurt, DE'];
const MOCK_MODELS = ['[XGBoost]', '[Isolation Forest]', '[AutoEncoder]', '[LSTM]', '[Random Forest]'];

const generateNormalTx = (idOffset) => {
  return {
    id: `tx-${idOffset}`,
    time: new Date(idOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    userId: `USR_${Math.floor(Math.random() * 9000) + 1000}`,
    amount: `$${(Math.random() * 800 + 10).toFixed(2)}`,
    location: MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)],
    riskScore: Math.floor(Math.random() * 18) + 1, // 1 to 18
    model: MOCK_MODELS[Math.floor(Math.random() * MOCK_MODELS.length)],
    actionTaken: null
  };
};

const generateScamTx = (idOffset) => {
  return {
    id: `tx-${idOffset}`,
    time: new Date(idOffset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    userId: `USR_9924`,
    amount: `$${(Math.random() * 25000 + 15000).toFixed(2)}`, // Large anomalous amount
    location: 'Kuala Lumpur, MY', // Anomaly location
    riskScore: Math.floor(Math.random() * 10) + 88, // 88 to 97
    model: '[Ensemble Fraud Net]',
    actionTaken: null
  };
};

export default function FinancialRisk() {
  const [riskStatus, setRiskStatus] = useState('SECURE');
  const [txVelocity, setTxVelocity] = useState(1420);
  const [flaggedCount, setFlaggedCount] = useState(3);
  const [inspectedVolume, setInspectedVolume] = useState(842500);

  const [transactions, setTransactions] = useState([]);
  const [velocityAlerts, setVelocityAlerts] = useState([
    { id: 1, type: 'velocity', desc: 'User_412: 3 transfers within 60 seconds to unrecognized routing' },
    { id: 2, type: 'logon', desc: 'Logon Alert: Same user active in Paris and London within 10 minutes' }
  ]);

  // Pre-fill initial transactions
  useEffect(() => {
    const initialTxs = Array.from({ length: 8 }).map((_, i) => generateNormalTx(Date.now() - (8 - i) * 1500));
    setTransactions(initialTxs.reverse());
  }, []);

  // Standard live stream
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(prev => {
        const newTx = generateNormalTx(Date.now());
        return [newTx, ...prev].slice(0, 50); // Keep last 50
      });
      
      setTxVelocity(prev => {
        const jitter = Math.floor(Math.random() * 30 - 15);
        return Math.max(1000, prev + jitter);
      });
      setInspectedVolume(prev => prev + Math.floor(Math.random() * 4000 + 1000));
    }, 2800);
    
    return () => clearInterval(interval);
  }, []);

  const triggerScam = () => {
    const newTx = generateScamTx(Date.now());
    setTransactions(prev => [newTx, ...prev].slice(0, 50));
    setRiskStatus('CRITICAL ALERT');
    setFlaggedCount(prev => prev + 1);
    
    setVelocityAlerts(prev => [
      { id: Date.now() + 1, type: 'velocity', desc: `User_9924: 8 rapid transfers in 15 seconds to offshore routing.` },
      { id: Date.now() + 2, type: 'logon', desc: `Logon Alert: User_9924 active in New York and Kuala Lumpur within 2 minutes.` },
      ...prev
    ].slice(0, 10));
  };

  const handleTxAction = (id, riskScore) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === id) {
        return { ...tx, actionTaken: riskScore > 75 ? 'FROZEN' : 'FLAGGED' };
      }
      return tx;
    }));
    
    // Resolve critical alert if high-risk tx is frozen
    if (riskScore > 75) {
      setRiskStatus('SECURE');
    }
  };

  return (
    <div className="overview-page">
      {/* Top Risk Overview Cards */}
      <div className="grid-stats">
        <div className={`card-stat ${riskStatus === 'SECURE' ? 'success' : 'danger'}`}>
          <div className="stat-header">
            <span>RISK ASSESSMENT STATUS</span>
            <i className={`fa-solid ${riskStatus === 'SECURE' ? 'fa-shield-check' : 'fa-shield-halved'} stat-icon`}></i>
          </div>
          <div className="stat-value" style={{ fontSize: '1.4rem', letterSpacing: '1px', marginTop: '0.4rem', marginBottom: '0.4rem' }}>
            {riskStatus}
          </div>
          <div className="stat-footer">
            {riskStatus === 'SECURE' ? (
              <span className="trend-up"><i className="fa-solid fa-check"></i> Monitoring active</span>
            ) : (
              <span className="trend-down" style={{ fontWeight: 700 }}><i className="fa-solid fa-triangle-exclamation"></i> Immediate action required</span>
            )}
          </div>
        </div>

        <div className="card-stat primary">
          <div className="stat-header">
            <span>TRANSACTION VELOCITY</span>
            <i className="fa-solid fa-gauge-high stat-icon"></i>
          </div>
          <div className="stat-value">{txVelocity.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>tx/min</span></div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> Real-time volatility tracking</span>
          </div>
        </div>

        <div className="card-stat warning">
          <div className="stat-header">
            <span>FLAGGED ANOMALIES</span>
            <i className="fa-solid fa-flag stat-icon"></i>
          </div>
          <div className="stat-value">{flaggedCount}</div>
          <div className="stat-footer">
            <span style={{ color: 'var(--color-warning)' }}><i className="fa-solid fa-pause"></i> Currently held for review</span>
          </div>
        </div>

        <div className="card-stat success">
          <div className="stat-header">
            <span>INSPECTED VOLUME</span>
            <i className="fa-solid fa-magnifying-glass-dollar stat-icon"></i>
          </div>
          <div className="stat-value">${(inspectedVolume / 1000).toFixed(1)}k</div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> Last 60 minutes window</span>
          </div>
        </div>
      </div>

      {/* Main Panels Grid */}
      <div className="grid-2col">
        {/* Left Panel: Transaction Log Auditor */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-money-check-dollar" style={{ color: "var(--color-success)" }}></i> Transaction Log Auditor
              </h3>
              <p className="panel-subtitle">Live stream of transactions scoring against ensemble fraud models</p>
            </div>
            <div className="panel-actions">
              <button 
                className="btn-submit" 
                style={{ background: 'var(--color-danger)', boxShadow: 'var(--glow-danger)', padding: '0.5rem 1rem' }}
                onClick={triggerScam}
              >
                <i className="fa-solid fa-biohazard" style={{ marginRight: '0.5rem' }}></i> Trigger Mock Scam Flow
              </button>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto', width: '100%', maxHeight: '450px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 10 }}>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>User ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Location</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Model</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ 
                    borderBottom: '1px solid var(--border-light)', 
                    backgroundColor: tx.riskScore > 75 ? (tx.actionTaken ? 'rgba(255,183,3,0.05)' : 'rgba(255,56,56,0.1)') : 'transparent',
                    transition: 'var(--transition-smooth)'
                  }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{tx.time}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{tx.userId}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{tx.amount}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tx.location}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{tx.model}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: tx.riskScore > 75 ? 'rgba(255,56,56,0.15)' : 'rgba(0,255,135,0.1)',
                        color: tx.riskScore > 75 ? 'var(--color-danger)' : 'var(--color-success)',
                        boxShadow: tx.riskScore > 75 ? 'var(--glow-danger)' : 'none'
                      }}>
                        {tx.riskScore}%
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {!tx.actionTaken ? (
                        <button 
                          onClick={() => handleTxAction(tx.id, tx.riskScore)}
                          style={{
                            background: tx.riskScore > 75 ? 'var(--color-danger)' : 'transparent',
                            color: tx.riskScore > 75 ? '#fff' : 'var(--text-primary)',
                            border: `1px solid ${tx.riskScore > 75 ? 'var(--color-danger)' : 'var(--border-light)'}`,
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            boxShadow: tx.riskScore > 75 ? 'var(--glow-danger)' : 'none',
                            transition: 'var(--transition-smooth)'
                          }}>
                          {tx.riskScore > 75 ? 'Freeze Account' : 'Flag'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <i className="fa-solid fa-lock"></i> {tx.actionTaken}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: Account Transfer Velocity & Logon Mapping Panel */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--color-secondary)' }}></i> Mapping & Velocity
              </h3>
              <p className="panel-subtitle">Geolocational mapping & rapid transfer alerts</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '450px', paddingRight: '0.25rem' }}>
            {velocityAlerts.map(alert => (
              <div key={alert.id} style={{ 
                  background: 'var(--bg-card)', 
                  borderLeft: `4px solid ${alert.type === 'logon' ? 'var(--color-warning)' : 'var(--color-secondary)'}`,
                  padding: '0.85rem 1rem',
                  borderRadius: '0 8px 8px 0',
                  borderTop: '1px solid var(--border-light)',
                  borderRight: '1px solid var(--border-light)',
                  borderBottom: '1px solid var(--border-light)',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: alert.type === 'logon' ? 'var(--color-warning)' : 'var(--color-secondary)', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  marginBottom: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <i className={`fa-solid ${alert.type === 'logon' ? 'fa-location-dot' : 'fa-money-bill-transfer'}`}></i>
                  {alert.type === 'logon' ? 'Geolocational Logon' : 'Transfer Velocity'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {alert.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
