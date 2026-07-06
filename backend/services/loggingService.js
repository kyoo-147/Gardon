const fs = require('fs').promises;
const path = require('path');

class LoggingService {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  // Ensure log directory exists
  async ensureLogDirectory() {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  // Get current date string for filename
  getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // Get log file path for current date
  getLogFilePath() {
    const dateString = this.getCurrentDateString();
    return path.join(this.logDir, `${dateString}.json`);
  }

  // Read existing logs for current date
  async readCurrentLogs() {
    try {
      const logFilePath = this.getLogFilePath();
      const data = await fs.readFile(logFilePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  // Write logs to file
  async writeLogs(logs) {
    try {
      const logFilePath = this.getLogFilePath();
      await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (error) {
      console.error('Error writing logs:', error);
    }
  }

  // Create log entry
  createLogEntry(userId, role, message, type = 'chat', metadata = {}) {
    // SECURITY: Require valid userId - no anonymous fallback
    if (!userId) {
      throw new Error('Valid userId is required for logging');
    }
    
    return {
      userId: userId,
      role: role, // 'user' or 'bot'
      message: message,
      type: type, // 'chat', 'device_control', 'weather', 'status_report'
      metadata: {
        ...metadata,
        model: metadata.model || 'qwen3:0.6b',
        intent: metadata.intent || 'general_chat'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Log user message
  async logUserMessage(userId, message, type = 'chat', metadata = {}) {
    const logEntry = this.createLogEntry(userId, 'user', message, type, metadata);
    await this.appendLog(logEntry);
    return logEntry;
  }

  // Log bot message
  async logBotMessage(userId, message, type = 'chat', metadata = {}) {
    const logEntry = this.createLogEntry(userId, 'bot', message, type, metadata);
    await this.appendLog(logEntry);
    return logEntry;
  }

  // Log conversation (both user and bot messages)
  async logConversation(userId, userMessage, botMessage, type = 'chat', metadata = {}) {
    const userLog = await this.logUserMessage(userId, userMessage, type, metadata);
    const botLog = await this.logBotMessage(userId, botMessage, type, metadata);
    
    return {
      userLog,
      botLog
    };
  }

  // Append log entry to current date file
  async appendLog(logEntry) {
    try {
      const currentLogs = await this.readCurrentLogs();
      currentLogs.push(logEntry);
      await this.writeLogs(currentLogs);
    } catch (error) {
      console.error('Error appending log:', error);
    }
  }

  // Get logs for specific user
  async getUserLogs(userId, limit = 50) {
    try {
      const currentLogs = await this.readCurrentLogs();
      return currentLogs
        .filter(log => log.userId === userId)
        .slice(-limit); // Get last N entries
    } catch (error) {
      console.error('Error getting user logs:', error);
      return [];
    }
  }

  // Get conversation history for user (last N exchanges)
  async getConversationHistory(userId, limit = 10) {
    try {
      const userLogs = await this.getUserLogs(userId, limit * 2); // Get more to ensure pairs
      const conversation = [];
      
      // Group messages into conversation pairs
      for (let i = 0; i < userLogs.length - 1; i++) {
        if (userLogs[i].role === 'user' && userLogs[i + 1].role === 'bot') {
          conversation.push({
            user: userLogs[i],
            bot: userLogs[i + 1]
          });
        }
      }
      
      return conversation.slice(-limit); // Return last N exchanges
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Get analytics for current day
  async getDailyAnalytics() {
    try {
      const currentLogs = await this.readCurrentLogs();
      
      const analytics = {
        totalMessages: currentLogs.length,
        userMessages: currentLogs.filter(log => log.role === 'user').length,
        botMessages: currentLogs.filter(log => log.role === 'bot').length,
        uniqueUsers: [...new Set(currentLogs.map(log => log.userId))].length,
        messageTypes: {},
        intents: {},
        hourlyDistribution: {}
      };

      // Count message types and intents
      currentLogs.forEach(log => {
        // Count by type
        analytics.messageTypes[log.type] = (analytics.messageTypes[log.type] || 0) + 1;
        
        // Count by intent
        if (log.metadata && log.metadata.intent) {
          analytics.intents[log.metadata.intent] = (analytics.intents[log.metadata.intent] || 0) + 1;
        }
        
        // Count by hour
        const hour = new Date(log.timestamp).getHours();
        analytics.hourlyDistribution[hour] = (analytics.hourlyDistribution[hour] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      console.error('Error getting daily analytics:', error);
      return null;
    }
  }

  // Log AI response (alias for logBotMessage)
  async logAIResponse(userId, response, intent, metadata = {}) {
    return await this.logBotMessage(userId, response, intent, {
      ...metadata,
      isAIResponse: true
    });
  }

  // Log error messages
  async logError(source, errorMessage, metadata = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      level: 'error',
      source: source,
      message: errorMessage,
      metadata: metadata
    };

    try {
      const logs = await this.readCurrentLogs();
      logs.push(errorLog);
      await this.writeLogs(logs);
      
      // Also log to console for immediate visibility
      console.error(`[${source}] ${errorMessage}`, metadata);
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  // Clean old log files (keep last 30 days)
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.logDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Deleted old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }

  // Log AI response - required by chatbot route
  async logAIResponse(userId, response, intent, metadata = {}) {
    return await this.logBotMessage(userId, response, intent, metadata);
  }

  // Log error - required by chatbot route
  async logError(component, errorMessage, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      component: component,
      error: errorMessage,
      metadata: metadata
    };
    
    await this.appendLog(logEntry);
    console.error(`[${component}] ${errorMessage}`, metadata);
  }

  // Generic log method - for any custom logging
  async log(type, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: type,
      ...data
    };
    
    await this.appendLog(logEntry);
    console.log(`[${type}]`, data);
  }
}

module.exports = new LoggingService();
