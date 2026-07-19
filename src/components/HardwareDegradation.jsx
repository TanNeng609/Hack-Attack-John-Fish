import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

// Must match firmware/HardwareMonitor/HardwareMonitor.ino RACK_PATH
const RACK_PATH = 'racks/rack-01';

// Mirrors the local threshold logic on the ESP32, used only as a client-side
// fallback classifier when running in simulated (no-hardware) mode.
const THRESHOLDS = { componentDegrading: 65, componentCritical: 85 };

function classify(componentTemp, doorOpen, waterDetected) {
  if (waterDetected || componentTemp >= THRESHOLDS.componentCritical) return 'Critical';
  if (doorOpen || componentTemp >= THRESHOLDS.componentDegrading) return 'Degrading';
  return 'Normal';
}

export default function HardwareDegradation({ setActiveTab, setAlerts, addRemediationAction }) {
  const [mode, setMode] = useState('connecting'); // 'connecting' | 'live' | 'simulated'
  const [telemetry, setTelemetry] = useState({
    ambientTemp: 24.5,
    ambientHumidity: 45,
    componentTemp: 38,
    doorOpen: false,
    waterDetected: false,
  });
  const [prediction, setPrediction] = useState({ state: 'Normal', confidence: 0.97 });
  const [events, setEvents] = useState([]);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const history = useRef({ labels: [], ambient: [], component: [] });
  const lastCriticalRef = useRef(false);
  const creepingRef = useRef(false);

  if (history.current.labels.length === 0) {
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      history.current.labels.push(new Date(now.getTime() - i * 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      history.current.ambient.push(parseFloat((24 + Math.random() * 2).toFixed(1)));
      history.current.component.push(parseFloat((37 + Math.random() * 3).toFixed(1)));
    }
  }

  const addEvent = (type, message) => {
    setEvents(prev => [
      { id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString([], { hour12: false }), type, message },
      ...prev,
    ].slice(0, 30));
  };

  const pushPoint = (ambient, component) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    history.current.labels.push(timeStr);
    history.current.ambient.push(ambient);
    history.current.component.push(component);
    if (history.current.labels.length > 10) {
      history.current.labels.shift();
      history.current.ambient.shift();
      history.current.component.shift();
    }
    if (chartInstance.current) chartInstance.current.update('none');
  };

  // Chart init
  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.current.labels,
          datasets: [
            {
              label: 'Component Temp (°C)',
              data: history.current.component,
              borderColor: '#ff3838',
              backgroundColor: 'rgba(255, 56, 56, 0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.35,
            },
            {
              label: 'Ambient Temp (°C)',
              data: history.current.ambient,
              borderColor: '#00f2fe',
              backgroundColor: 'rgba(0, 242, 254, 0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.03)' },
              ticks: { color: '#64748b', font: { family: 'Fira Code', size: 9 } },
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: 'rgba(255, 255, 255, 0.03)' },
              ticks: { color: '#64748b' },
              title: { display: true, text: 'Temperature (°C)', color: '#64748b', font: { family: 'Outfit', size: 10 } },
            },
          },
          plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', weight: '500' } } },
          },
        },
      });
    }
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  // Subscribe to live Firebase telemetry; fall back to simulated demo data
  // if the rack isn't publishing yet (no device, DB not created, wrong URL).
  useEffect(() => {
    const dbRef = ref(db, RACK_PATH);
    let receivedLive = false;

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) return;
        receivedLive = true;
        setMode('live');

        const readings = val.telemetry ? Object.values(val.telemetry) : [];
        const latest = readings[readings.length - 1];
        if (latest) {
          setTelemetry({
            ambientTemp: latest.ambientTemp,
            ambientHumidity: latest.ambientHumidity,
            componentTemp: latest.componentTemp,
            doorOpen: !!latest.doorOpen,
            waterDetected: !!latest.waterDetected,
          });
          pushPoint(latest.ambientTemp, latest.componentTemp);
        }

        if (val.prediction) {
          setPrediction({ state: val.prediction.state, confidence: val.prediction.confidence });
        }

        if (val.events) {
          const list = Object.values(val.events)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 30)
            .map(e => ({ id: e.ts + Math.random(), ts: new Date(e.ts).toLocaleTimeString([], { hour12: false }), type: e.type, message: e.message }));
          setEvents(list);
        }
      },
      (error) => {
        console.warn('[HardwareDegradation] Firebase RTDB unavailable, using simulated telemetry:', error.message);
        setMode('simulated');
      }
    );

    const connectTimeout = setTimeout(() => {
      if (!receivedLive) setMode('simulated');
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(connectTimeout);
    };
  }, []);

  // Simulated telemetry generator, used only when no real rack is publishing.
  useEffect(() => {
    if (mode !== 'simulated') return;

    const interval = setInterval(() => {
      setTelemetry(prev => {
        const ambientTemp = parseFloat((24 + Math.random() * 3).toFixed(1));
        const ambientHumidity = Math.floor(42 + Math.random() * 12);

        if (!creepingRef.current && Math.random() > 0.93) creepingRef.current = true;
        let componentTemp = prev.componentTemp;
        if (creepingRef.current) {
          componentTemp = Math.min(92, componentTemp + 3 + Math.random() * 2);
          if (componentTemp >= 92) creepingRef.current = false;
        } else {
          componentTemp = Math.max(36, componentTemp + (Math.random() * 2 - 1.2));
        }
        componentTemp = parseFloat(componentTemp.toFixed(1));

        const doorOpen = Math.random() > 0.985 ? !prev.doorOpen : prev.doorOpen;
        const waterDetected = Math.random() > 0.997 ? true : (prev.waterDetected && Math.random() > 0.3 ? true : false);

        if (doorOpen && !prev.doorOpen) addEvent('tamper', 'Rack door opened — tilt switch triggered.');
        if (!doorOpen && prev.doorOpen) addEvent('info', 'Rack door closed.');
        if (waterDetected && !prev.waterDetected) addEvent('water', 'Water sensor triggered — possible leak/condensation.');
        if (componentTemp >= THRESHOLDS.componentCritical && prev.componentTemp < THRESHOLDS.componentCritical) {
          addEvent('thermal', `Component temp reached ${componentTemp}°C — AI classified rack state as Critical.`);
        }

        const state = classify(componentTemp, doorOpen, waterDetected);
        const confidence = state === 'Normal' ? 0.9 + Math.random() * 0.09 : state === 'Degrading' ? 0.7 + Math.random() * 0.2 : 0.85 + Math.random() * 0.14;
        setPrediction({ state, confidence: parseFloat(confidence.toFixed(2)) });

        pushPoint(ambientTemp, componentTemp);
        return { ambientTemp, ambientHumidity, componentTemp, doorOpen, waterDetected };
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [mode]);

  // Surface a Critical prediction as a cross-domain alert in the global notification bell.
  useEffect(() => {
    const isCritical = prediction.state === 'Critical';
    if (isCritical && !lastCriticalRef.current && setAlerts) {
      setAlerts(prev => [
        {
          id: 'alert-hw-' + Date.now(),
          type: 'danger',
          tag: 'HARDWARE',
          time: 'Just Now',
          title: 'Server Rack Predicted Critical',
          desc: `Component temp ${telemetry.componentTemp}°C, confidence ${(prediction.confidence * 100).toFixed(0)}%.${telemetry.waterDetected ? ' Water sensor triggered.' : ''}`,
          xai: 'MLP classifier flagged sustained thermal rise past the critical threshold, correlated with rack door and water sensor state.',
          expanded: false,
        },
        ...prev,
      ]);
    }
    lastCriticalRef.current = isCritical;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction.state]);

  const stateColor = prediction.state === 'Critical' ? 'danger' : prediction.state === 'Degrading' ? 'warning' : 'success';

  return (
    <div className="hardware-page">
      <div className="grid-stats">
        <div className="card-stat primary">
          <div className="stat-header"><span>AMBIENT TEMP</span><i className="fa-solid fa-temperature-half stat-icon"></i></div>
          <div className="stat-value">{telemetry.ambientTemp}°C</div>
          <div className="stat-footer"><span>DHT11 · Server Room</span></div>
        </div>

        <div className="card-stat primary">
          <div className="stat-header"><span>AMBIENT HUMIDITY</span><i className="fa-solid fa-droplet stat-icon"></i></div>
          <div className="stat-value">{telemetry.ambientHumidity}%</div>
          <div className="stat-footer"><span>DHT11 · Server Room</span></div>
        </div>

        <div className={`card-stat ${stateColor}`}>
          <div className="stat-header"><span>COMPONENT TEMP</span><i className="fa-solid fa-microchip stat-icon"></i></div>
          <div className="stat-value">{telemetry.componentTemp}°C</div>
          <div className="stat-footer"><span>Thermistor · CPU Heatsink</span></div>
        </div>

        <div className={`card-stat ${stateColor}`}>
          <div className="stat-header"><span>AI PREDICTED STATE</span><i className="fa-solid fa-brain stat-icon"></i></div>
          <div className="stat-value">{prediction.state}</div>
          <div className="stat-footer"><span>{(prediction.confidence * 100).toFixed(0)}% confidence</span></div>
        </div>
      </div>

      <div className="grid-2col">
        <div className="card-panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title"><i className="fa-solid fa-server" style={{ color: 'var(--color-primary)' }}></i> Rack Thermal Telemetry</h3>
              <p className="panel-subtitle">Component vs. ambient temperature, streamed from the ESP32 rack monitor</p>
            </div>
            <div className="panel-actions">
              <span
                className="live-badge"
                style={mode === 'simulated' ? { background: 'rgba(255, 183, 3, 0.1)', color: 'var(--color-warning)', borderColor: 'rgba(255, 183, 3, 0.15)' } : undefined}
              >
                <span
                  className="live-dot"
                  style={mode === 'simulated' ? { background: 'var(--color-warning)', boxShadow: 'var(--glow-warning)' } : undefined}
                ></span>
                {mode === 'live' ? 'LIVE' : mode === 'simulated' ? 'SIMULATED (no device)' : 'CONNECTING'}
              </span>
            </div>
          </div>
          <div className="chart-container">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-door-closed" style={{ color: telemetry.doorOpen ? 'var(--color-danger)' : 'var(--color-success)' }}></i> Rack Door / Tilt Switch</span>
              <span className="predict-card-value" style={{ color: telemetry.doorOpen ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {telemetry.doorOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
            <div className="predict-card-desc">Physical security tamper detection on the rack enclosure.</div>
          </div>

          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-water" style={{ color: telemetry.waterDetected ? 'var(--color-danger)' : 'var(--color-success)' }}></i> Water / Leak Sensor</span>
              <span className="predict-card-value" style={{ color: telemetry.waterDetected ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {telemetry.waterDetected ? 'DETECTED' : 'DRY'}
              </span>
            </div>
            <div className="predict-card-desc">Triggers the active buzzer immediately, independent of cloud connectivity.</div>
          </div>

          <div className="predict-card">
            <div className="predict-card-header">
              <span><i className="fa-solid fa-chart-line" style={{ color: 'var(--color-secondary)' }}></i> Degradation Classifier (MLP)</span>
              <span
                className="predict-card-value"
                style={{ color: stateColor === 'danger' ? 'var(--color-danger)' : stateColor === 'warning' ? 'var(--color-warning)' : 'var(--text-primary)' }}
              >
                {prediction.state}
              </span>
            </div>
            <div className="predict-card-desc">Classifies Normal / Degrading / Critical from thermal trend, door, and water sensor features.</div>
          </div>
        </div>
      </div>

      <div className="terminal-container">
        <div className="terminal-header">
          <span><i className="fa-solid fa-terminal"></i> Hardware Event & Fault Log</span>
          <span>Ingestion: {mode === 'live' ? 'Firebase RTDB' : mode === 'simulated' ? 'Simulated' : 'Connecting...'}</span>
        </div>
        <div>
          {events.length === 0 && <div className="log-line info">Waiting for rack telemetry...</div>}
          {events.map(ev => (
            <div key={ev.id} className={`log-line ${ev.type === 'thermal' || ev.type === 'water' ? 'error' : ev.type === 'tamper' ? 'warning' : 'info'}`}>
              {ev.ts} [{ev.type}] {ev.message}
              {ev.type === 'thermal' && (
                <button
                  className="btn-escalate"
                  onClick={() => {
                    if (addRemediationAction) addRemediationAction({
                      title: 'Throttle Rack Workload & Dispatch Technician: rack-01',
                      confidence: 91,
                      risk: 'CRITICAL',
                      type: 'danger',
                      reason: `${ev.message} Escalated from Hardware Degradation monitor.`
                    });
                    if (setActiveTab) setActiveTab('remediation');
                  }}
                >
                  <i className="fa-solid fa-shield-halved"></i> Escalate to Remediation Center
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
