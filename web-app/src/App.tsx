import React, { useState } from 'react';
import { useMQTT } from './hooks/useMQTT';
import { MQTTConfigComponent } from './components/MQTTConfig';
import { LEDControl } from './components/LEDControl';
import { MQTTTopics } from './components/MQTTTopics';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'config' | 'control' | 'topics'>('config');
  
  const {
    connectionStatus,
    esp32Status,
    messages,
    connect,
    disconnect,
    publishMessage,
    subscribeTopic,
    unsubscribeTopic,
    controlLED,
    requestESP32Status,
    clearMessages
  } = useMQTT();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚀 ESP32 MQTT Control Center</h1>
          <div className="connection-indicators">
            <span className={`indicator ${connectionStatus.mqtt ? 'connected' : 'disconnected'}`}>
              {connectionStatus.mqtt ? '🟢' : '🔴'} MQTT
            </span>
            <span className={`indicator ${connectionStatus.esp32 ? 'connected' : 'disconnected'}`}>
              {connectionStatus.esp32 ? '🟢' : '🔴'} ESP32
            </span>
          </div>
        </div>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          🔧 Configuration
        </button>
        <button
          className={`tab-btn ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
        >
          💡 LED Control
        </button>
        <button
          className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          📡 MQTT Topics
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'config' && (
          <MQTTConfigComponent
            onConnect={connect}
            onDisconnect={disconnect}
            isConnected={connectionStatus.mqtt}
          />
        )}

        {activeTab === 'control' && (
          <LEDControl
            esp32Status={esp32Status}
            connectionStatus={connectionStatus}
            onLEDControl={controlLED}
            onRequestStatus={requestESP32Status}
          />
        )}

        {activeTab === 'topics' && (
          <MQTTTopics
            messages={messages}
            isConnected={connectionStatus.mqtt}
            onPublish={publishMessage}
            onSubscribe={subscribeTopic}
            onUnsubscribe={unsubscribeTopic}
            onClearMessages={clearMessages}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>ESP32 MQTT Control Center - Professional IoT Management</p>
        <p>Real-time LED control via MQTT WebSocket</p>
      </footer>
    </div>
  );
}

export default App
