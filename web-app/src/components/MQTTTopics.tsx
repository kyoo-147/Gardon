import React, { useState } from 'react';
import { MQTTMessage, DEFAULT_TOPICS } from '../types/mqtt';

interface MQTTTopicsProps {
  messages: MQTTMessage[];
  isConnected: boolean;
  onPublish: (topic: string, payload: string, qos?: 0 | 1 | 2) => void;
  onSubscribe: (topic: string, qos?: 0 | 1 | 2) => void;
  onUnsubscribe: (topic: string) => void;
  onClearMessages: () => void;
}

export const MQTTTopics: React.FC<MQTTTopicsProps> = ({
  messages,
  isConnected,
  onPublish,
  onSubscribe,
  onUnsubscribe,
  onClearMessages
}) => {
  const [publishTopic, setPublishTopic] = useState(DEFAULT_TOPICS.QOS0);
  const [publishPayload, setPublishPayload] = useState('');
  const [publishQos, setPublishQos] = useState<0 | 1 | 2>(0);
  const [subscribeTopic, setSubscribeTopic] = useState('');
  const [subscribeQos, setSubscribeQos] = useState<0 | 1 | 2>(0);

  const handlePublish = () => {
    if (publishTopic && publishPayload) {
      onPublish(publishTopic, publishPayload, publishQos);
      setPublishPayload(''); // Clear payload after publishing
    }
  };

  const handleSubscribe = () => {
    if (subscribeTopic) {
      onSubscribe(subscribeTopic, subscribeQos);
      setSubscribeTopic(''); // Clear topic after subscribing
    }
  };

  const handleQuickPublish = (topic: string, payload: string) => {
    onPublish(topic, payload, 1);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const predefinedTopics = [
    { label: 'QoS 0 Topic', value: DEFAULT_TOPICS.QOS0 },
    { label: 'QoS 1 Topic', value: DEFAULT_TOPICS.QOS1 },
    { label: 'LED GPIO 22', value: DEFAULT_TOPICS.LED_GPIO22 },
    { label: 'LED GPIO 23', value: DEFAULT_TOPICS.LED_GPIO23 },
    { label: 'ESP32 Status', value: DEFAULT_TOPICS.STATUS },
    { label: 'ESP32 Response', value: DEFAULT_TOPICS.RESPONSE }
  ];

  return (
    <div className="mqtt-topics-panel">
      <h3>📡 MQTT Topics & Messages</h3>

      {/* Quick Subscribe Section */}
      <div className="quick-subscribe">
        <h4>Quick Subscribe to Default Topics</h4>
        <div className="topic-buttons">
          {predefinedTopics.map((topic) => (
            <button
              key={topic.value}
              onClick={() => onSubscribe(topic.value, topic.value.includes('qos1') ? 1 : 0)}
              disabled={!isConnected}
              className="topic-btn"
              title={`Subscribe to ${topic.value}`}
            >
              📥 {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Subscribe Section */}
      <div className="manual-subscribe">
        <h4>Subscribe to Custom Topic</h4>
        <div className="subscribe-form">
          <input
            type="text"
            value={subscribeTopic}
            onChange={(e) => setSubscribeTopic(e.target.value)}
            placeholder="Enter topic to subscribe..."
            disabled={!isConnected}
          />
          <select
            value={subscribeQos}
            onChange={(e) => setSubscribeQos(Number(e.target.value) as 0 | 1 | 2)}
            disabled={!isConnected}
          >
            <option value={0}>QoS 0</option>
            <option value={1}>QoS 1</option>
            <option value={2}>QoS 2</option>
          </select>
          <button
            onClick={handleSubscribe}
            disabled={!isConnected || !subscribeTopic}
            className="subscribe-btn"
          >
            📥 Subscribe
          </button>
        </div>
      </div>

      {/* Publish Section */}
      <div className="publish-section">
        <h4>Publish Message</h4>
        <div className="publish-form">
          <div className="topic-selector">
            <label>Topic:</label>
            <select
              value={publishTopic}
              onChange={(e) => setPublishTopic(e.target.value)}
              disabled={!isConnected}
            >
              {predefinedTopics.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={publishTopic}
              onChange={(e) => setPublishTopic(e.target.value)}
              placeholder="Or enter custom topic..."
              disabled={!isConnected}
            />
          </div>
          
          <div className="payload-input">
            <label>Payload:</label>
            <textarea
              value={publishPayload}
              onChange={(e) => setPublishPayload(e.target.value)}
              placeholder="Enter message payload..."
              disabled={!isConnected}
              rows={3}
            />
          </div>
          
          <div className="qos-selector">
            <label>QoS:</label>
            <select
              value={publishQos}
              onChange={(e) => setPublishQos(Number(e.target.value) as 0 | 1 | 2)}
              disabled={!isConnected}
            >
              <option value={0}>QoS 0 (At most once)</option>
              <option value={1}>QoS 1 (At least once)</option>
              <option value={2}>QoS 2 (Exactly once)</option>
            </select>
          </div>
          
          <button
            onClick={handlePublish}
            disabled={!isConnected || !publishTopic || !publishPayload}
            className="publish-btn"
          >
            📤 Publish Message
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Quick Test Commands</h4>
        <div className="quick-commands">
          <button
            onClick={() => handleQuickPublish(DEFAULT_TOPICS.LED_GPIO22, 'ON')}
            disabled={!isConnected}
            className="quick-cmd on-cmd"
          >
            💡 LED1 ON
          </button>
          <button
            onClick={() => handleQuickPublish(DEFAULT_TOPICS.LED_GPIO22, 'OFF')}
            disabled={!isConnected}
            className="quick-cmd off-cmd"
          >
            🌙 LED1 OFF
          </button>
          <button
            onClick={() => handleQuickPublish(DEFAULT_TOPICS.LED_GPIO23, 'ON')}
            disabled={!isConnected}
            className="quick-cmd on-cmd"
          >
            💡 LED2 ON
          </button>
          <button
            onClick={() => handleQuickPublish(DEFAULT_TOPICS.LED_GPIO23, 'OFF')}
            disabled={!isConnected}
            className="quick-cmd off-cmd"
          >
            🌙 LED2 OFF
          </button>
          <button
            onClick={() => handleQuickPublish(DEFAULT_TOPICS.STATUS, 'STATUS')}
            disabled={!isConnected}
            className="quick-cmd status-cmd"
          >
            📊 Request Status
          </button>
        </div>
      </div>

      {/* Messages Log */}
      <div className="messages-section">
        <div className="messages-header">
          <h4>📨 Received Messages ({messages.length})</h4>
          <button
            onClick={onClearMessages}
            className="clear-btn"
            disabled={messages.length === 0}
          >
            🗑️ Clear
          </button>
        </div>
        
        <div className="messages-log">
          {messages.length === 0 ? (
            <div className="no-messages">
              No messages received yet. Subscribe to topics to see messages here.
            </div>
          ) : (
            messages.slice().reverse().map((message, index) => (
              <div key={index} className="message-item">
                <div className="message-header">
                  <span className="message-topic">{message.topic}</span>
                  <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                  <span className="message-qos">QoS {message.qos}</span>
                </div>
                <div className="message-payload">{message.payload}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
