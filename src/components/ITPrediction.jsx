import React, { useState, useEffect, useRef } from 'react';

export default function ITPrediction({ setActiveTab, addRemediationAction }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Node Statuses (healthy, warning, critical)
  const [nodes, setNodes] = useState({
    api: 'healthy',
    user: 'healthy',
    payment: 'healthy',
    db: 'healthy'
  });

  // Model Confidences
  const [models, setModels] = useState({
    thread: 2,
    memory: 1,
    network: 5
  });

  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Initial dummy logs
  useEffect(() => {
    const initialLogs = [
      { id: 1, type: 'info', text: '[system] AegisAI IT Predictive Engine initialized.' },
      { id: 2, type: 'info', text: '[api-gateway] Listening on port 443.' },
      { id: 3, type: 'info', text: '[user-service] Connected to db-cluster-primary.' },
      { id: 4, type: 'info', text: '[payment-gateway] Stripe webhook active.' },
      { id: 5, type: 'info', text: '[predictive-model] Baseline established. Monitoring...' },
    ];
    setLogs(initialLogs);
  }, []);

  // Background log generation
  useEffect(() => {
    let interval;
    if (!isSimulating) {
      interval = setInterval(() => {
        const endpoints = ['/api/v1/users', '/api/v1/health', '/auth/verify'];
        const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
        const latency = Math.floor(Math.random() * 20) + 10;
        addLog('info', `[api-gateway] GET ${ep} 200 OK - ${latency}ms`);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  // Simulation Sequence
  useEffect(() => {
    if (!isSimulating) return;

    const sequence = [
      {
        delay: 1000,
        action: () => {
          setSimulationStep(1);
          addLog('warning', '[user-service] WARN: Incoming request rate spiked by 400%');
          setNodes(prev => ({ ...prev, api: 'warning' }));
          setModels(prev => ({ ...prev, network: 45 }));
        }
      },
      {
        delay: 3000,
        action: () => {
          setSimulationStep(2);
          addLog('warning', '[user-service] WARN: Thread pool utilization at 85%');
          addLog('highlight', '[predictive-model] Anomaly Detected: user-service thread pool filling faster than GC cycle.', { xai: 'Flagged: 400% deviation from historical baseline tensor for this time of day.' });
          setNodes(prev => ({ ...prev, user: 'warning' }));
          setModels(prev => ({ ...prev, thread: 68 }));
        }
      },
      {
        delay: 5500,
        action: () => {
          setSimulationStep(3);
          addLog('error', '[db-cluster] ERROR: Connection timeout from user-service (max connections reached)');
          setNodes(prev => ({ ...prev, db: 'warning' }));
          setModels(prev => ({ ...prev, thread: 82 }));
        }
      },
      {
        delay: 8000,
        action: () => {
          setSimulationStep(4);
          addLog('error', '[user-service] CRITICAL: Thread Exhaustion (OOM). Service unresponsive.');
          addLog('error', '[payment-gateway] ERROR: Upstream user-service failed. Checkout abandoned.');
          addLog('highlight', '[predictive-model] PREDICTION CONFIRMED: Thread exhaustion triggered cascading failure.', { escalate: true });
          setNodes(prev => ({ ...prev, user: 'critical', payment: 'critical' }));
          setModels(prev => ({ ...prev, thread: 99, network: 72 }));
        }
      }
    ];

    const timeouts = sequence.map(step => setTimeout(step.action, step.delay));
    return () => timeouts.forEach(clearTimeout);
  }, [isSimulating]);

  const addLog = (type, text, options = {}) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, text: `${time} ${text}`, ...options }]);
  };

  const startSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(0);
    setNodes({ api: 'healthy', user: 'healthy', payment: 'healthy', db: 'healthy' });
    setModels({ thread: 2, memory: 1, network: 5 });
    addLog('info', '========================================');
    addLog('highlight', '[system] INITIATING TRAFFIC SPIKE SIMULATION...');
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimulationStep(0);
    setNodes({ api: 'healthy', user: 'healthy', payment: 'healthy', db: 'healthy' });
    setModels({ thread: 2, memory: 1, network: 5 });
    setSelectedNode(null);
    addLog('info', '========================================');
    addLog('success', '[system] System reset to baseline.');
  };

  const getNodeMetrics = (nodeId) => {
    const isWarn = nodes[nodeId] === 'warning';
    const isCrit = nodes[nodeId] === 'critical';
    
    let cpu = '35%';
    let mem = '2.1GB';
    let status = 'Operational';
    let cpuPct = 35;
    let baseCpuPct = 30;

    if (nodeId === 'api') {
      if (isWarn) { cpu = '85%'; mem = '4.5GB'; status = 'High Load'; cpuPct = 85; }
      if (isCrit) { cpu = '99%'; mem = '6.2GB'; status = 'Failing'; cpuPct = 99; }
    } else if (nodeId === 'user') {
      baseCpuPct = 40;
      cpuPct = 45;
      if (isWarn) { cpu = '92%'; mem = '6.8GB'; status = 'Thread Warning'; cpuPct = 92; }
      if (isCrit) { cpu = '100%'; mem = '8.4GB (OOM)'; status = 'Exhausted'; cpuPct = 100; }
    } else if (nodeId === 'db') {
      baseCpuPct = 50;
      cpuPct = 55;
      if (isWarn) { cpu = '65%'; mem = '16GB'; status = 'Connection Wait'; cpuPct = 65; }
    } else if (nodeId === 'payment') {
      baseCpuPct = 20;
      cpuPct = 25;
      if (isCrit) { cpu = '15%'; mem = '1.2GB'; status = 'Upstream Timeout'; cpuPct = 15; }
    }

    return { cpu, mem, status, cpuPct, baseCpuPct };
  };

  return (
    <div className="it-prediction-page">
      <div className="panel-header" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="panel-title"><i className="fa-solid fa-network-wired" style={{ color: "var(--color-secondary)" }}></i> Infrastructure Topology & Predictive Map</h2>
          <p className="panel-subtitle">Click nodes to view real-time telemetry. AI models monitor for cascading failures.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isSimulating ? (
            <button className="btn-simulate" onClick={startSimulation}>
              <i className="fa-solid fa-bolt"></i> Simulate Traffic Spike
            </button>
          ) : (
            <button className="btn-simulate" style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }} onClick={resetSimulation}>
              <i className="fa-solid fa-rotate-left"></i> Reset Architecture
            </button>
          )}
        </div>
      </div>

      <div className="grid-2col" style={{ gridTemplateColumns: '1.5fr 1fr', marginBottom: 0 }}>
        {/* Topology Map */}
        <div className="topology-container">
          <div className={`topology-connection ${simulationStep >= 1 ? 'active' : ''}`} style={{ width: '120px', left: '160px' }}></div>
          <div className={`topology-connection ${simulationStep >= 3 ? 'critical' : ''}`} style={{ width: '120px', right: '160px', top: '35%' }}></div>
          <div className={`topology-connection ${simulationStep >= 4 ? 'critical' : ''}`} style={{ width: '120px', right: '160px', top: '65%' }}></div>

          <div className={`topology-node ${nodes.api}`} onClick={() => setSelectedNode('api')}>
            <i className="fa-solid fa-globe"></i>
            <span className="node-label">API Gateway</span>
          </div>

          <div className={`topology-node ${nodes.user}`} onClick={() => setSelectedNode('user')}>
            <i className="fa-solid fa-users-gear"></i>
            <span className="node-label">User Service</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={`topology-node ${nodes.db}`} onClick={() => setSelectedNode('db')}>
              <i className="fa-solid fa-database"></i>
              <span className="node-label">DB Cluster</span>
            </div>
            <div className={`topology-node ${nodes.payment}`} onClick={() => setSelectedNode('payment')} style={{ position: 'relative' }}>
              <i className="fa-solid fa-credit-card"></i>
              <span className="node-label">Payment Gateway</span>
              
              {/* Overlay Revenue at Risk */}
              {(nodes.payment === 'warning' || nodes.payment === 'critical') && (
                <div className="revenue-risk-badge">
                  Est. Risk: RM 42,500 / hr
                </div>
              )}
            </div>
          </div>

          {selectedNode && (
            <div className="node-details-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <strong>{selectedNode.toUpperCase()} Node</strong>
                <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedNode(null)}></i>
              </div>
              <div className="node-metric">
                <span className="node-metric-label">Status</span>
                <span className="node-metric-val" style={{ color: nodes[selectedNode] === 'critical' ? 'var(--color-danger)' : nodes[selectedNode] === 'warning' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {getNodeMetrics(selectedNode).status}
                </span>
              </div>
              <div className="node-metric">
                <span className="node-metric-label">CPU Load</span>
                <span className="node-metric-val">{getNodeMetrics(selectedNode).cpu}</span>
              </div>
              <div className="node-metric">
                <span className="node-metric-label">Memory</span>
                <span className="node-metric-val">{getNodeMetrics(selectedNode).mem}</span>
              </div>
              
              {/* Historical Baseline Comparison Chart */}
              <div className="baseline-chart" title="Real-time vs Historical Baseline for this time of day">
                <div className="chart-col">
                  <div className="chart-bar baseline" style={{ height: `${getNodeMetrics(selectedNode).baseCpuPct}%` }}></div>
                  <span className="chart-label">Base</span>
                </div>
                <div className="chart-col">
                  <div className={`chart-bar current ${nodes[selectedNode]}`} style={{ height: `${getNodeMetrics(selectedNode).cpuPct}%` }}></div>
                  <span className="chart-label">Live</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* AI Model Status Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)' }}></i> Thread Exhaustion Predictor</span>
              <span className="predict-card-value" style={{ color: models.thread > 80 ? 'var(--color-danger)' : models.thread > 50 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                {models.thread}%
              </span>
            </div>
            <div className="predict-card-desc">Confidence score of impending thread pool crash based on request rates and GC logs.</div>
          </div>
          
          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-network-wired" style={{ color: 'var(--color-secondary)' }}></i> Network Partition Classifier</span>
              <span className="predict-card-value">{models.network}%</span>
            </div>
            <div className="predict-card-desc">Probability of service isolation or gateway timeout cascading.</div>
          </div>

          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-memory" style={{ color: 'var(--color-success)' }}></i> Memory Leak Detector</span>
              <span className="predict-card-value">{models.memory}%</span>
            </div>
            <div className="predict-card-desc">Long-term heap saturation analysis over a 24-hour sliding window.</div>
          </div>
        </div>
      </div>

      {/* Deep Log Terminal */}
      <div className="terminal-container">
        <div className="terminal-header">
          <span><i className="fa-solid fa-terminal"></i> AegisAI Deep-Log Analysis Feed</span>
          <span>Log Ingestion: Active</span>
        </div>
        <div>
          {logs.map(log => (
            <div key={log.id} className={`log-line ${log.type}`}>
              {log.text}
              
              {/* Explainable AI Tag */}
              {log.xai && (
                <span className="xai-tag" title={log.xai}>
                  <i className="fa-solid fa-microchip"></i> Explainable AI Match
                </span>
              )}

              {/* Escalate to Remediation Button */}
              {log.escalate && (
                <button
                  className="btn-escalate"
                  onClick={() => {
                    if (addRemediationAction) addRemediationAction({
                      title: 'Autoscale Pod Instances: user-service',
                      confidence: 94,
                      risk: 'CRITICAL',
                      type: 'danger',
                      reason: 'Thread exhaustion on user-service triggered cascading failure into payment gateway. Escalated from IT Prediction.'
                    });
                    if(setActiveTab) setActiveTab('remediation');
                    else window.dispatchEvent(new CustomEvent('navigate', { detail: 'remediation' }));
                  }}
                >
                  <i className="fa-solid fa-shield-halved"></i> Escalate to Remediation Center
                </button>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
