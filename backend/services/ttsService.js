const { EdgeTTS } = require('@travisvn/edge-tts');
const fs = require('fs').promises;
const path = require('path');

class TTSService {
  constructor() {
    // Các voice tiếng Việt chất lượng cao
    this.vietnameseVoices = [
      'vi-VN-HoaiMyNeural',
      'vi-VN-NamMinhNeural'
    ];
    
    // Voice mặc định
    this.defaultVoice = 'vi-VN-HoaiMyNeural'; // Giọng nữ tự nhiên
    
    // Thư mục lưu file audio tạm
    this.tempDir = path.join(__dirname, '../temp/audio');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Chuyển đổi text thành speech
   * @param {string} text - Văn bản cần chuyển đổi
   * @param {string} voice - Voice ID (tùy chọn)
   * @param {object} options - Các tùy chọn khác
   * @returns {Promise<object>} - Thông tin file audio đã tạo
   */
  async textToSpeech(text, voice = null, options = {}) {
    try {
      // Làm sạch text
      const cleanText = this.cleanText(text);
      if (!cleanText.trim()) {
        throw new Error('Text không hợp lệ');
      }

      // Chọn voice
      const selectedVoice = voice || this.defaultVoice;
      
      // Tạo instance EdgeTTS
      const tts = new EdgeTTS(cleanText, selectedVoice);
      
      // Synthesize
      const result = await tts.synthesize();
      
      // Tạo filename unique
      const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
      const filePath = path.join(this.tempDir, filename);
      
      // Lưu file audio
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
      await fs.writeFile(filePath, audioBuffer);
      
      return {
        success: true,
        filePath,
        filename,
        voice: selectedVoice,
        text: cleanText,
        size: audioBuffer.length,
        duration: this.estimateDuration(cleanText)
      };
      
    } catch (error) {
      console.error('TTS Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Làm sạch văn bản để TTS xử lý tốt hơn
   * @param {string} text 
   * @returns {string}
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      // Loại bỏ markdown và HTML tags
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      
      // Loại bỏ các ký tự đặc biệt
      .replace(/[#*_~`]/g, '')
      
      // Thay thế emoji bằng mô tả
      .replace(/🤖/g, 'robot')
      .replace(/✨/g, '')
      .replace(/🏠/g, 'nhà')
      .replace(/🌤️/g, 'thời tiết')
      .replace(/📊/g, 'biểu đồ')
      .replace(/💬/g, 'chat')
      
      // Chuẩn hóa khoảng trắng
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Ước tính thời lượng audio (giây)
   * @param {string} text 
   * @returns {number}
   */
  estimateDuration(text) {
    // Ước tính: ~150 từ/phút cho tiếng Việt
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
  }

  /**
   * Xóa file audio tạm sau khi sử dụng
   * @param {string} filePath 
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }

  /**
   * Xóa các file cũ (> 1 giờ)
   */
  async cleanupOldFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          await this.cleanupFile(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old files:', error);
    }
  }

  /**
   * Lấy danh sách các voice có sẵn
   * @returns {Array}
   */
  getAvailableVoices() {
    return [
      {
        id: 'vi-VN-HoaiMyNeural',
        name: 'Hoài My',
        gender: 'Female',
        language: 'vi-VN',
        description: 'Giọng nữ tự nhiên, phù hợp cho chatbot'
      },
      {
        id: 'vi-VN-NamMinhNeural',
        name: 'Nam Minh', 
        gender: 'Male',
        language: 'vi-VN',
        description: 'Giọng nam tự nhiên'
      }
    ];
  }
}

// Tạo instance singleton
const ttsService = new TTSService();

// Cleanup task - chạy mỗi giờ
setInterval(() => {
  ttsService.cleanupOldFiles();
}, 60 * 60 * 1000);

module.exports = ttsService;
