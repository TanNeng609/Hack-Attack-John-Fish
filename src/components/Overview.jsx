import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function Overview({ alerts, setAlerts }) {
  const [systemHealth, setSystemHealth] = useState(98.4);
  const [threatIndex, setThreatIndex] = useState(12);
  const [riskIndex, setRiskIndex] = useState("Low");

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const telemetryHistory = useRef({
    labels: [],
    cpu: [],
    latency: []
  });

  const activeAnomaly = useRef(null);

  if (telemetryHistory.current.labels.length === 0) {
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      telemetryHistory.current.labels.push(timeStr);
      telemetryHistory.current.cpu.push(Math.floor(Math.random() * 20) + 30);
      telemetryHistory.current.latency.push(Math.floor(Math.random() * 8) + 10);
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
              label: 'CPU Usage (%)',
              data: telemetryHistory.current.cpu,
              borderColor: '#00f2fe',
              borderWidth: 2,
              backgroundColor: 'rgba(0, 242, 254, 0.05)',
              fill: true,
              tension: 0.35,
              yAxisID: 'y'
            },
            {
              label: 'DB Response Latency (ms)',
              data: telemetryHistory.current.latency,
              borderColor: '#9d4edd',
              borderWidth: 2,
              backgroundColor: 'rgba(157, 78, 221, 0.05)',
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
              ticks: { color: '#64748b' }
            },
            y1: {
              position: 'right',
              min: 0,
              max: 300,
              grid: { drawOnChartArea: false },
              ticks: { color: '#64748b' }
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
      let baseCpu = hasAnomaly ? 92 : 38;
      let baseLatency = hasAnomaly ? 245 : 12;

      let cpu = Math.max(0, Math.min(100, Math.floor(baseCpu + (Math.random() * 10 - 5))));
      let latency = Math.max(2, Math.floor(baseLatency + (Math.random() * 6 - 3)));

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      telemetryHistory.current.labels.push(timeStr);
      telemetryHistory.current.cpu.push(cpu);
      telemetryHistory.current.latency.push(latency);

      if (telemetryHistory.current.labels.length > 10) {
        telemetryHistory.current.labels.shift();
        telemetryHistory.current.cpu.shift();
        telemetryHistory.current.latency.shift();
      }

      if (!hasAnomaly) {
        setSystemHealth(parseFloat((98.0 + Math.random() * 1.5).toFixed(1)));
        setThreatIndex(Math.floor(8 + Math.random() * 5));
      } else {
        setSystemHealth(78.2);
        setThreatIndex(86);
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
          tag: "IT INCIDENT",
          time: "Just Now",
          title: "Imminent Thread Pool Exhaustion Predict",
          desc: "Service user-service in cluster US-East-1 is exhibiting signs of thread pool saturation. Estimated time to service crash: 14 minutes.",
          xai: "Correlated Anomalies Detected: (1) response latency spiked to 245ms. (2) DB connection pool usage is stuck at 100%. (3) Outage Model diagnostic confidence is 94.6%. Action required: Autoscale user-service via Remediation Console.",
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
      title: "IT Threat Resolved & Normalised",
      desc: "Service user-service scaled to 5 replicas. Cache pool flushed. Latency restored.",
      xai: "System auto-check passed. HTTP status 200 OK returned on health-checks. CPU load returned to baseline (38%).",
      expanded: false
    };

    setAlerts(prev => [resolutionAlert, ...prev]);
    activeAnomaly.current = null;
    setSystemHealth(99.4);
    setThreatIndex(10);
  };

  const activeAlertsCount = alerts.filter(a => a.type === "danger").length;

  return (
    <div className="overview-page">
      <div className="grid-stats">
        <div className="card-stat success">
          <div className="stat-header">
            <span>SYSTEM HEALTH</span>
            <i className="fa-solid fa-heart-pulse stat-icon"></i>
          </div>
          <div className="stat-value">{systemHealth}%</div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> +0.2%</span>
            <span>vs last hour</span>
          </div>
        </div>

        <div className="card-stat primary">
          <div className="stat-header">
            <span>INCIDENT THREAT INDEX</span>
            <i className="fa-solid fa-triangle-exclamation stat-icon"></i>
          </div>
          <div className="stat-value">{threatIndex}%</div>
          <div className="stat-footer">
            <span className={`trend-${threatIndex > 50 ? 'up' : 'down'}`}>
              <i className={`fa-solid fa-arrow-${threatIndex > 50 ? 'up' : 'down'}`}></i> 
              {threatIndex > 50 ? ' +74%' : ' -4.5%'}
            </span>
            <span>vs yesterday</span>
          </div>
        </div>

        <div className="card-stat danger">
          <div className="stat-header">
            <span>FINANCIAL RISK INDEX</span>
            <i className="fa-solid fa-shield-cat stat-icon"></i>
          </div>
          <div className="stat-value">{riskIndex}</div>
          <div className="stat-footer">
            <span>Active Monitoring online</span>
          </div>
        </div>

        <div className="card-stat warning" style={{ cursor: activeAnomaly.current ? 'pointer' : 'default' }} onClick={resetAnomaly}>
          <div className="stat-header">
            <span>ACTIVE ALERTS</span>
            <i className="fa-solid fa-bell stat-icon"></i>
          </div>
          <div className="stat-value">{activeAlertsCount}</div>
          <div className="stat-footer">
            {activeAnomaly.current ? (
              <span className="trend-down" style={{ fontWeight: '600', textDecoration: 'underline' }}>
                Click to mock Auto-Fix
              </span>
            ) : (
              <span>All systems operational</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-gauge-high" style={{ color: "var(--color-primary)" }}></i> Real-Time Infrastructure Performance
              </h3>
              <p className="panel-subtitle">Monitoring CPU usage and microservice API latency (2.5s updates)</p>
            </div>
            <div className="panel-actions">
              <span className="live-badge"><span className="live-dot"></span>LIVE</span>
            </div>
          </div>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-bullseye" style={{ color: "var(--color-danger)" }}></i> Aegis AI Prediction Alerts
              </h3>
              <p className="panel-subtitle">Interactive alert details (Click card to expand Explainable AI logs)</p>
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
