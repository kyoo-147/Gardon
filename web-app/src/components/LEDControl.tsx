import React from 'react';
import { ESP32Status, ConnectionStatus } from '../types/mqtt';

interface LEDControlProps {
  esp32Status: ESP32Status;
  connectionStatus: ConnectionStatus;
  onLEDControl: (gpio: 22 | 23, state: boolean) => void;
  onRequestStatus: () => void;
}

export const LEDControl: React.FC<LEDControlProps> = ({
  esp32Status,
  connectionStatus,
  onLEDControl,
  onRequestStatus
}) => {
  const isConnected = connectionStatus.mqtt && connectionStatus.esp32;
  
  const handleLEDToggle = (gpio: 22 | 23) => {
    const currentState = esp32Status.leds[`gpio${gpio}` as keyof typeof esp32Status.leds];
    onLEDControl(gpio, !currentState);
  };

  const formatLastUpdate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="led-control-panel">
      <h3>💡 LED Control Panel</h3>
      
      <div className="esp32-status">
        <div className="status-header">
          <span className={`status-badge ${connectionStatus.esp32 ? 'online' : 'offline'}`}>
            {connectionStatus.esp32 ? '🟢 ESP32 Online' : '🔴 ESP32 Offline'}
          </span>
          <button 
            onClick={onRequestStatus}
            className="refresh-btn"
            disabled={!connectionStatus.mqtt}
            title="Request ESP32 Status"
          >
            🔄 Refresh Status
          </button>
        </div>
        
        {esp32Status.lastUpdate && (
          <div className="last-update">
            Last update: {formatLastUpdate(esp32Status.lastUpdate)}
          </div>
        )}
      </div>

      <div className="led-controls">
        {/* LED GPIO 22 */}
        <div className="led-item">
          <div className="led-info">
            <h4>LED 1 - GPIO 22</h4>
            <div className="led-visual">
              <div className={`led-indicator ${esp32Status.leds.gpio22 ? 'on' : 'off'}`}>
                {esp32Status.leds.gpio22 ? '💡' : '⚫'}
              </div>
              <span className="led-status">
                {esp32Status.leds.gpio22 ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          
          <div className="led-controls-buttons">
            <button
              onClick={() => onLEDControl(22, true)}
              disabled={!isConnected || esp32Status.leds.gpio22}
              className="led-btn on-btn"
            >
              🔆 Turn ON
            </button>
            <button
              onClick={() => onLEDControl(22, false)}
              disabled={!isConnected || !esp32Status.leds.gpio22}
              className="led-btn off-btn"
            >
              🌙 Turn OFF
            </button>
            <button
              onClick={() => handleLEDToggle(22)}
              disabled={!isConnected}
              className="led-btn toggle-btn"
            >
              🔄 Toggle
            </button>
          </div>
        </div>

        {/* LED GPIO 23 */}
        <div className="led-item">
          <div className="led-info">
            <h4>LED 2 - GPIO 23</h4>
            <div className="led-visual">
              <div className={`led-indicator ${esp32Status.leds.gpio23 ? 'on' : 'off'}`}>
                {esp32Status.leds.gpio23 ? '💡' : '⚫'}
              </div>
              <span className="led-status">
                {esp32Status.leds.gpio23 ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          
          <div className="led-controls-buttons">
            <button
              onClick={() => onLEDControl(23, true)}
              disabled={!isConnected || esp32Status.leds.gpio23}
              className="led-btn on-btn"
            >
              🔆 Turn ON
            </button>
            <button
              onClick={() => onLEDControl(23, false)}
              disabled={!isConnected || !esp32Status.leds.gpio23}
              className="led-btn off-btn"
            >
              🌙 Turn OFF
            </button>
            <button
              onClick={() => handleLEDToggle(23)}
              disabled={!isConnected}
              className="led-btn toggle-btn"
            >
              🔄 Toggle
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="quick-buttons">
          <button
            onClick={() => {
              onLEDControl(22, true);
              onLEDControl(23, true);
            }}
            disabled={!isConnected}
            className="quick-btn all-on"
          >
            🌟 All ON
          </button>
          <button
            onClick={() => {
              onLEDControl(22, false);
              onLEDControl(23, false);
            }}
            disabled={!isConnected}
            className="quick-btn all-off"
          >
            🌑 All OFF
          </button>
          <button
            onClick={() => {
              handleLEDToggle(22);
              handleLEDToggle(23);
            }}
            disabled={!isConnected}
            className="quick-btn toggle-all"
          >
            🎭 Toggle All
          </button>
        </div>
      </div>

      {!connectionStatus.mqtt && (
        <div className="warning-message">
          ⚠️ Please connect to MQTT broker first
        </div>
      )}

      {connectionStatus.mqtt && !connectionStatus.esp32 && (
        <div className="info-message">
          ℹ️ Waiting for ESP32 connection...
        </div>
      )}
    </div>
  );
};
