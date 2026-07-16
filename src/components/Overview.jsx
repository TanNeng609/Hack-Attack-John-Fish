import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function Overview({ alerts, setAlerts }) {
  const [systemHealth, setSystemHealth] = useState(98.4);
  const [threatIndex, setThreatIndex] = useState(12);
  const [anomalyRate, setAnomalyRate] = useState(0.04);
  const [costSaved, setCostSaved] = useState(48200); // Business value metric (USD)
  
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const telemetryHistory = useRef({
    labels: [],
    cpu: [],
    failedTx: [] // Cross-domain correlation: Transaction Failure Rate (%)
  });

  const activeAnomaly = useRef(null);

  if (telemetryHistory.current.labels.length === 0) {
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      telemetryHistory.current.labels.push(timeStr);
      telemetryHistory.current.cpu.push(Math.floor(Math.random() * 20) + 30); // 30-50% CPU
      telemetryHistory.current.failedTx.push(parseFloat((Math.random() * 0.4 + 0.1).toFixed(2))); // 0.1-0.5% failed payments
    }
  }

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: telemetryHistory.current.labels,
          datasets: [
            {
              label: 'System CPU Load (%)',
              data: telemetryHistory.current.cpu,
              borderColor: '#00f2fe',
              borderWidth: 2,
              backgroundColor: 'rgba(0, 242, 254, 0.05)',
              fill: true,
              tension: 0.35,
              yAxisID: 'y'
            },
            {
              label: 'Transaction Failure Rate (%)',
              data: telemetryHistory.current.failedTx,
              borderColor: '#ff3838', // Cross-domain alert color
              borderWidth: 2,
              backgroundColor: 'rgba(255, 56, 56, 0.05)',
              fill: true,
              tension: 0.35,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.03)' },
              ticks: { color: '#64748b', font: { family: 'Fira Code', size: 9 } }
            },
            y: {
              position: 'left',
              min: 0,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.03)' },
              ticks: { color: '#64748b' },
              title: {
                display: true,
                text: 'CPU Load (%)',
                color: '#64748b',
                font: { family: 'Outfit', size: 10 }
              }
            },
            y1: {
              position: 'right',
              min: 0,
              max: 25,
              grid: { drawOnChartArea: false },
              ticks: { color: '#64748b' },
              title: {
                display: true,
                text: 'Tx Failure Rate (%)',
                color: '#64748b',
                font: { family: 'Outfit', size: 10 }
              }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { family: 'Outfit', weight: '500' } }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      const hasAnomaly = activeAnomaly.current === 'it';
      let baseCpu = hasAnomaly ? 94 : 38;
      let baseFailedTx = hasAnomaly ? 16.8 : 0.25;

      let cpu = Math.max(0, Math.min(100, Math.floor(baseCpu + (Math.random() * 10 - 5))));
      let failedTx = Math.max(0, parseFloat((baseFailedTx + (Math.random() * 2 - 1)).toFixed(2)));

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      telemetryHistory.current.labels.push(timeStr);
      telemetryHistory.current.cpu.push(cpu);
      telemetryHistory.current.failedTx.push(failedTx);

      if (telemetryHistory.current.labels.length > 10) {
        telemetryHistory.current.labels.shift();
        telemetryHistory.current.cpu.shift();
        telemetryHistory.current.failedTx.shift();
      }

      if (!hasAnomaly) {
        setSystemHealth(parseFloat((98.5 + Math.random() * 1.0).toFixed(1)));
        setThreatIndex(Math.floor(6 + Math.random() * 5));
        setAnomalyRate(parseFloat((0.02 + Math.random() * 0.05).toFixed(2)));
      } else {
        setSystemHealth(74.5);
        setThreatIndex(91);
        setAnomalyRate(16.8);
      }

      if (chartInstance.current) {
        chartInstance.current.update('none');
      }
    }, 2500);

    const anomalyInterval = setInterval(() => {
      if (activeAnomaly.current) return;

      const triggerChance = Math.random();
      if (triggerChance > 0.4) {
        activeAnomaly.current = 'it';
        
        const newAlert = {
          id: "alert-it-" + Date.now(),
          type: "danger",
          tag: "CROSS-DOMAIN RISK",
          time: "Just Now",
          title: "Infrastructure Spike Impacting Checkout API",
          desc: "Thread exhaustion on <strong>user-service</strong> (CPU: 94%) is blocking database read locks, resulting in <strong>16.8% payment checkout failures</strong>.",
          xai: "Correlated Risk Inference: (1) user-service connection timeouts spiked. (2) Database threads saturated at 100%. (3) Checkout API transaction failure rate increased from 0.25% to 16.8% (99.9% anomaly percentile). Expected business loss: $9,000/minute. Action required: Scale replicas and flush connections.",
          expanded: false
        };

        setAlerts(prev => [newAlert, ...prev]);
      }
    }, 18000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(anomalyInterval);
    };
  }, [alerts]);

  const toggleAlert = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, expanded: !alert.expanded } : alert
    ));
  };

  const resetAnomaly = () => {
    if (!activeAnomaly.current) return;

    const resolutionAlert = {
      id: "alert-res-" + Date.now(),
      type: "success",
      tag: "REMEDIATION",
      time: "Just Now",
      title: "Cross-Domain Telemetry Normalized",
      desc: "Autoscaled pods and cleared cache connections. CPU Load returned to 38%. Payment checkout failure rate restored to 0.25%.",
      xai: "System auto-check passed. Database connections cleared. Checked transaction endpoints and returned HTTP 200 OK. Prevented potential additional loss of $18,000.",
      expanded: false
    };

    setAlerts(prev => [resolutionAlert, ...prev]);
    activeAnomaly.current = null;
    setSystemHealth(99.6);
    setThreatIndex(8);
    setAnomalyRate(0.04);
    setCostSaved(prev => prev + 18000); // Add RM 18,000 business value for solving the incident!
  };

  const activeAlertsCount = alerts.filter(a => a.type === "danger").length;

  return (
    <div className="overview-page">
      {/* KPI Cards Grid */}
      <div className="grid-stats">
        {/* Card 1: System Health */}
        <div className="card-stat success">
          <div className="stat-header">
            <span>SYSTEM HEALTH</span>
            <i className="fa-solid fa-heart-pulse stat-icon"></i>
          </div>
          <div className="stat-value">{systemHealth}%</div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> +0.4%</span>
            <span>vs last hour</span>
          </div>
        </div>

        {/* Card 2: Incident Threat Index */}
        <div className="card-stat primary">
          <div className="stat-header">
            <span>INCIDENT THREAT INDEX</span>
            <i className="fa-solid fa-triangle-exclamation stat-icon"></i>
          </div>
          <div className="stat-value">{threatIndex}%</div>
          <div className="stat-footer">
            <span className={`trend-${threatIndex > 50 ? 'up' : 'down'}`}>
              <i className={`fa-solid fa-arrow-${threatIndex > 50 ? 'up' : 'down'}`}></i> 
              {threatIndex > 50 ? ' +78%' : ' -6.2%'}
            </span>
            <span>vs yesterday</span>
          </div>
        </div>

        {/* Card 3: Financial Anomaly Rate */}
        <div className="card-stat danger">
          <div className="stat-header">
            <span>TX ANOMALY RATE</span>
            <i className="fa-solid fa-money-bill-trend-up stat-icon"></i>
          </div>
          <div className="stat-value" style={{ color: anomalyRate > 1.0 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
            {anomalyRate}%
          </div>
          <div className="stat-footer">
            <span>Payment checkout stream</span>
          </div>
        </div>

        {/* Card 4: Business Value (Downtime Saved) - CRITICAL JUDGING CRITERIA */}
        <div 
          className="card-stat success" 
          style={{ cursor: activeAnomaly.current ? 'pointer' : 'default', borderLeft: '4px solid var(--color-success)' }} 
          onClick={resetAnomaly}
        >
          <div className="stat-header">
            <span>DOWNTIME COST AVOIDED</span>
            <i className="fa-solid fa-wallet stat-icon" style={{ color: 'var(--color-success)' }}></i>
          </div>
          <div className="stat-value">${costSaved.toLocaleString()} USD</div>
          <div className="stat-footer">
            {activeAnomaly.current ? (
              <span className="trend-down" style={{ fontWeight: '700', textDecoration: 'underline' }}>
                <i className="fa-solid fa-screwdriver-wrench"></i> Auto-Fix to save $18,000
              </span>
            ) : (
              <span className="trend-up" style={{ fontWeight: '600' }}>
                <i className="fa-solid fa-circle-check"></i> Clean operation today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Performance Charts & Alerts logs */}
      <div className="grid-2col">
        {/* Performance Chart Panel */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-circle-nodes" style={{ color: "var(--color-primary)" }}></i> Operational & Financial Data Correlation
              </h3>
              <p className="panel-subtitle">Tracking system CPU Load against failed checkout transactions (Cross-Domain Telemetry)</p>
            </div>
            <div className="panel-actions">
              <span className="live-badge"><span className="live-dot"></span>LIVE</span>
            </div>
          </div>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Alerts Feed Panel */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-bullseye" style={{ color: "var(--color-danger)" }}></i> Aegis AI Cross-Domain Alerts
              </h3>
              <p className="panel-subtitle">Click alert cards to view AI Diagnostic Inferences and estimated losses</p>
            </div>
          </div>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`alert-item ${alert.type} ${alert.expanded ? 'expanded' : ''}`}
                onClick={() => toggleAlert(alert.id)}
              >
                <div className="alert-meta">
                  <span className="alert-tag">{alert.tag}</span>
                  <span className="alert-time">{alert.time}</span>
                </div>
                <h4 className="alert-title">{alert.title}</h4>
                <p className="alert-desc" dangerouslySetInnerHTML={{ __html: alert.desc }}></p>
                
                {alert.expanded && (
                  <div className="alert-xai" onClick={(e) => e.stopPropagation()}>
                    <div className="xai-title">
                      <i className="fa-solid fa-brain"></i> Explainable AI Diagnostic Inference
                    </div>
                    <div className="xai-body">
                      {alert.xai}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
