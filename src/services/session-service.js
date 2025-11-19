const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const os = require('os');

class SessionService {
  constructor() {
    // Session 文件路径
    this.sessionPath = path.join(app.getPath('userData'), 'session.enc');
    // Session 有效期：10天（毫秒）
    this.SESSION_DURATION = 10 * 24 * 60 * 60 * 1000;
    
    // 生成加密密钥（基于应用ID和设备信息，不存储明文）
    this.encryptionKey = this.generateEncryptionKey();
  }

  // 生成加密密钥（基于应用ID和设备信息）
  generateEncryptionKey() {
    const appId = 'com.electron.todolist';
    const machineId = os.hostname();
    const userDataPath = app.getPath('userData');
    
    // 使用这些信息生成一个固定的密钥
    const keyMaterial = `${appId}-${machineId}-${userDataPath}`;
    const hash = crypto.createHash('sha256').update(keyMaterial).digest();
    
    return hash;
  }

  // 加密数据
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // 返回格式：iv:authTag:encrypted
      return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted: encrypted
      };
    } catch (error) {
      console.error('加密失败:', error);
      throw error;
    }
  }

  // 解密数据
  decrypt(encryptedData) {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      const encrypted = encryptedData.encrypted;
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error);
      throw error;
    }
  }

  // 保存 session
  saveSession(session) {
    try {
      if (!session) {
        return { success: false, error: 'Session 为空' };
      }

      const sessionData = {
        session: session,
        expiresAt: Date.now() + this.SESSION_DURATION,
        createdAt: Date.now()
      };

      const encrypted = this.encrypt(JSON.stringify(sessionData));
      const dataToSave = JSON.stringify(encrypted);

      fs.writeFileSync(this.sessionPath, dataToSave, { encoding: 'utf8', mode: 0o600 });
      
      return { success: true };
    } catch (error) {
      console.error('保存 session 失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取 session
  getSession() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return { success: false, session: null, error: 'Session 文件不存在' };
      }

      const encryptedData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
      const decrypted = this.decrypt(encryptedData);
      const sessionData = JSON.parse(decrypted);

      return {
        success: true,
        session: sessionData.session,
        expiresAt: sessionData.expiresAt,
        createdAt: sessionData.createdAt
      };
    } catch (error) {
      console.error('读取 session 失败:', error);
      // 如果解密失败，可能是文件损坏，删除它
      if (fs.existsSync(this.sessionPath)) {
        try {
          fs.unlinkSync(this.sessionPath);
        } catch (e) {
          console.error('删除损坏的 session 文件失败:', e);
        }
      }
      return { success: false, session: null, error: error.message };
    }
  }

  // 检查 session 是否有效
  isSessionValid() {
    try {
      const result = this.getSession();
      if (!result.success || !result.session) {
        return { valid: false, reason: 'Session 不存在' };
      }

      const now = Date.now();
      if (result.expiresAt <= now) {
        return { valid: false, reason: 'Session 已过期（10天有效期）', expiresAt: result.expiresAt };
      }

      return { valid: true, expiresAt: result.expiresAt };
    } catch (error) {
      console.error('检查 session 有效性失败:', error);
      return { valid: false, reason: error.message };
    }
  }

  // 清除 session
  clearSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
      return { success: true };
    } catch (error) {
      console.error('清除 session 失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取过期时间
  getExpirationTime() {
    try {
      const result = this.getSession();
      if (result.success && result.expiresAt) {
        return result.expiresAt;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // 获取剩余有效天数
  getRemainingDays() {
    try {
      const result = this.isSessionValid();
      if (result.valid && result.expiresAt) {
        const remainingMs = result.expiresAt - Date.now();
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        return remainingDays;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new SessionService();

