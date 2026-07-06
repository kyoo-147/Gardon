import React, { useState, useEffect } from 'react';
import { MQTTConfig, DEFAULT_MQTT_CONFIG } from '../types/mqtt';

interface MQTTConfigProps {
  onConnect: (config: MQTTConfig) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

const STORAGE_KEY = 'mqtt_config';

export const MQTTConfigComponent: React.FC<MQTTConfigProps> = ({
  onConnect,
  onDisconnect,
  isConnected
}) => {
  const [config, setConfig] = useState<MQTTConfig>(DEFAULT_MQTT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load saved config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_MQTT_CONFIG, ...parsed });
      } catch (e) {
        console.error('Error loading saved config:', e);
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = (newConfig: MQTTConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  const handleInputChange = (field: keyof MQTTConfig, value: string | number) => {
    const newConfig = { ...config, [field]: value };
    saveConfig(newConfig);
  };

  const handleConnect = () => {
    onConnect(config);
  };

  const handleDisconnect = () => {
    onDisconnect();
  };

  const resetToDefault = () => {
    saveConfig(DEFAULT_MQTT_CONFIG);
  };

  return (
    <div className="mqtt-config-panel">
      <h3>🔗 MQTT Configuration</h3>
      
      <div className="config-grid">
        <div className="form-group">
          <label htmlFor="clientId">Client ID:</label>
          <input
            id="clientId"
            type="text"
            value={config.clientId}
            onChange={(e) => handleInputChange('clientId', e.target.value)}
            disabled={isConnected}
            placeholder="navincase01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="host">Host:</label>
          <input
            id="host"
            type="text"
            value={config.host}
            onChange={(e) => handleInputChange('host', e.target.value)}
            disabled={isConnected}
            placeholder="mqtt.eclipseprojects.io"
          />
        </div>

        <div className="form-group">
          <label htmlFor="port">Port:</label>
          <input
            id="port"
            type="number"
            value={config.port}
            onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
            disabled={isConnected}
            placeholder="1883"
          />
        </div>

        <div className="form-group">
          <label htmlFor="protocol">Protocol:</label>
          <select
            id="protocol"
            value={config.protocol}
            onChange={(e) => handleInputChange('protocol', e.target.value)}
            disabled={isConnected}
          >
            <option value="mqtt">MQTT</option>
            <option value="mqtts">MQTTS</option>
            <option value="ws">WebSocket</option>
            <option value="wss">WebSocket Secure</option>
          </select>
        </div>
      </div>

      <div className="advanced-toggle">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="toggle-btn"
        >
          {showAdvanced ? '🔽' : '▶️'} Advanced Settings
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-config">
          <div className="form-group">
            <label htmlFor="username">Username (optional):</label>
            <input
              id="username"
              type="text"
              value={config.username || ''}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isConnected}
              placeholder="Leave empty if not required"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (optional):</label>
            <input
              id="password"
              type="password"
              value={config.password || ''}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isConnected}
              placeholder="Leave empty if not required"
            />
          </div>
        </div>
      )}

      <div className="connection-controls">
        {!isConnected ? (
          <button 
            onClick={handleConnect}
            className="connect-btn"
          >
            🚀 Connect to MQTT
          </button>
        ) : (
          <button 
            onClick={handleDisconnect}
            className="disconnect-btn"
          >
            🔌 Disconnect
          </button>
        )}

        <button 
          onClick={resetToDefault}
          className="reset-btn"
          disabled={isConnected}
        >
          🔄 Reset to Default
        </button>
      </div>

      <div className="connection-status">
        <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      <div className="connection-info">
        <small>
          {isConnected ? 
            `Connected to ${config.protocol}://${config.host}:${config.port}` :
            'Not connected to MQTT broker'
          }
        </small>
      </div>
    </div>
  );
};
