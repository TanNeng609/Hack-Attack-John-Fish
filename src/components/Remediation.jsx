import React, { useState, useEffect, useRef } from 'react';

export default function Remediation({ actions, setActions }) {
  const [terminalStatus, setTerminalStatus] = useState('IDLE');
  const [logs, setLogs] = useState([
    '[system] AegisAI Remediation Daemon active.',
    '[system] Listening for manual approval signals...'
  ]);
  const [lastActionTime, setLastActionTime] = useState('--:--:--');

  const terminalEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleExecute = (action) => {
    if (action.status !== 'Pending Approval') return;

    // Mark action as executing
    setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'Executing...' } : a));
    setTerminalStatus('RUNNING');
    
    const scriptSteps = [
      `>_ STARTING ACTION [${action.id}]`,
      `[exec] Initiating remediation: ${action.title}...`,
      `[exec] Initializing terminal environment...`,
      `[exec] Establishing SSH connection to target cluster node...`,
      `[exec] Authenticating via IAM roles... OK`,
      `[exec] Running root shell payload...`,
      `[exec] Applying configuration changes...`,
      `[exec] Verifying system state after execution...`,
      `[success] Script successfully executed. System health recovering.`
    ];

    let stepIndex = 0;
    
    // Initial separator if terminal already has logs
    setLogs(prev => [...prev, '', `----------------------------------------`]);

    const interval = setInterval(() => {
      // Capture the step value now -- the setLogs updater runs later, after
      // stepIndex has already been incremented, which pushed undefined into
      // the log list on the final tick and crashed the page render.
      const step = scriptSteps[stepIndex];
      setLogs(prev => [...prev, step]);
      stepIndex++;
      
      if (stepIndex >= scriptSteps.length) {
        clearInterval(interval);
        setTerminalStatus('IDLE');
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, status: 'Resolved' } : a));
        setLastActionTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC');
      }
    }, 600); // 600ms per step for a realistic feel
  };

  const pendingCount = actions.filter(a => a.status === 'Pending Approval').length;

  return (
    <div className="overview-page">
      {/* Top Status Overview Cards */}
      <div className="grid-stats">
        <div className="card-stat warning">
          <div className="stat-header">
            <span>ACTIVE RECOMMENDATIONS</span>
            <i className="fa-solid fa-lightbulb stat-icon"></i>
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-footer">
            <span>Pending admin approval</span>
          </div>
        </div>

        <div className="card-stat success">
          <div className="stat-header">
            <span>AUTO-REMEDIATION RATE</span>
            <i className="fa-solid fa-robot stat-icon"></i>
          </div>
          <div className="stat-value">92.4%</div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> +1.2%</span>
            <span>vs last week</span>
          </div>
        </div>

        <div className="card-stat primary">
          <div className="stat-header">
            <span>MTTR REDUCTION</span>
            <i className="fa-solid fa-stopwatch stat-icon"></i>
          </div>
          <div className="stat-value">-42 mins</div>
          <div className="stat-footer">
            <span className="trend-up"><i className="fa-solid fa-arrow-up"></i> Improved</span>
            <span>Mean Time To Repair</span>
          </div>
        </div>

        <div className="card-stat success">
          <div className="stat-header">
            <span>LAST EXECUTED</span>
            <i className="fa-solid fa-clock-rotate-left stat-icon"></i>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
            {lastActionTime !== '--:--:--' ? lastActionTime : 'No recent actions'}
          </div>
          <div className="stat-footer">
            {lastActionTime !== '--:--:--' ? (
               <span className="trend-up"><i className="fa-solid fa-check"></i> Resolved successfully</span>
            ) : (
               <span>Awaiting commands</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Panels Grid */}
      <div className="grid-2col">
        {/* Left Panel: Recommendations Feed */}
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--color-secondary)" }}></i> AI-Suggested Repair Actions
              </h3>
              <p className="panel-subtitle">Review and approve automated scripts to resolve detected anomalies</p>
            </div>
          </div>
          <div className="alerts-list" style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {actions.map((action) => (
              <div 
                key={action.id} 
                className={`alert-item ${action.type}`}
                style={{ cursor: 'default' }}
              >
                <div className="alert-meta">
                  <span className="alert-tag">{action.risk}</span>
                  <span style={{ 
                    fontWeight: 700, 
                    color: action.confidence >= 95 ? 'var(--color-success)' : 'var(--color-primary)' 
                  }}>
                    {action.confidence}% Confidence
                  </span>
                </div>
                <h4 className="alert-title" style={{ marginTop: '0.35rem', marginBottom: '0.25rem' }}>{action.title}</h4>
                <p className="alert-desc" style={{ marginBottom: '1rem' }}>
                  <i className="fa-solid fa-brain" style={{ marginRight: '6px', color: 'var(--text-muted)' }}></i> 
                  {action.reason}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                  {action.status === 'Pending Approval' && (
                    <button 
                      className="btn-submit" 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', alignSelf: 'flex-end', margin: 0 }}
                      onClick={() => handleExecute(action)}
                    >
                      <i className="fa-solid fa-play" style={{ marginRight: '6px' }}></i> Approve & Run Script
                    </button>
                  )}
                  {action.status === 'Executing...' && (
                    <div style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Executing...
                    </div>
                  )}
                  {action.status === 'Resolved' && (
                    <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-circle-check"></i> Resolved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Terminal Simulator */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden', background: '#0a0a0a' }}>
          <div className="panel-header" style={{ margin: 0, padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="panel-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-terminal" style={{ color: "var(--color-primary)" }}></i> &gt;_ automated_remediation_shell
            </h3>
            <div className="panel-actions">
              <span className="live-badge" style={{ 
                background: terminalStatus === 'RUNNING' ? 'rgba(255, 183, 3, 0.1)' : 'rgba(0, 255, 135, 0.1)',
                color: terminalStatus === 'RUNNING' ? 'var(--color-warning)' : 'var(--color-success)',
                borderColor: terminalStatus === 'RUNNING' ? 'rgba(255, 183, 3, 0.15)' : 'rgba(0, 255, 135, 0.15)'
              }}>
                <span className="live-dot" style={{ 
                  backgroundColor: terminalStatus === 'RUNNING' ? 'var(--color-warning)' : 'var(--color-success)',
                  boxShadow: terminalStatus === 'RUNNING' ? 'var(--glow-warning)' : 'var(--glow-success)'
                }}></span>
                [{terminalStatus}]
              </span>
            </div>
          </div>
          
          <div className="terminal-body" style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.85rem', 
            padding: '1.5rem', 
            height: '480px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.35rem' 
          }}>
            {logs.map((log, index) => {
              // Color formatting for terminal outputs
              let logColor = '#94a3b8'; // default grey
              if (log.includes('[success]')) logColor = '#00ff87';
              else if (log.includes('[exec]')) logColor = '#f8fafc';
              else if (log.includes('STARTING ACTION')) logColor = '#00f2fe';

              return (
                <div key={index} style={{ color: logColor, lineHeight: '1.4', wordBreak: 'break-all' }}>
                  {log}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
