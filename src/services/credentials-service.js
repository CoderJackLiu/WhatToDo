const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const os = require('os');

class CredentialsService {
  constructor() {
    // 凭据文件路径
    this.credentialsPath = path.join(app.getPath('userData'), 'credentials.enc');
    
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

  // 保存凭据
  saveCredentials(email, password) {
    try {
      if (!email || !password) {
        return { success: false, error: '邮箱或密码为空' };
      }

      const credentialsData = {
        email: email,
        password: password,
        savedAt: Date.now()
      };

      const encrypted = this.encrypt(JSON.stringify(credentialsData));
      const dataToSave = JSON.stringify(encrypted);

      fs.writeFileSync(this.credentialsPath, dataToSave, { encoding: 'utf8', mode: 0o600 });
      
      return { success: true };
    } catch (error) {
      console.error('保存凭据失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取凭据
  getCredentials() {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        return { success: false, email: null, password: null, error: '凭据文件不存在' };
      }

      const encryptedData = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      const decrypted = this.decrypt(encryptedData);
      const credentialsData = JSON.parse(decrypted);

      return {
        success: true,
        email: credentialsData.email,
        password: credentialsData.password,
        savedAt: credentialsData.savedAt
      };
    } catch (error) {
      console.error('读取凭据失败:', error);
      // 如果解密失败，可能是文件损坏，删除它
      if (fs.existsSync(this.credentialsPath)) {
        try {
          fs.unlinkSync(this.credentialsPath);
        } catch (e) {
          console.error('删除损坏的凭据文件失败:', e);
        }
      }
      return { success: false, email: null, password: null, error: error.message };
    }
  }

  // 清除凭据
  clearCredentials() {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        fs.unlinkSync(this.credentialsPath);
      }
      return { success: true };
    } catch (error) {
      console.error('清除凭据失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 检查是否有保存的凭据
  hasCredentials() {
    try {
      return fs.existsSync(this.credentialsPath);
    } catch (error) {
      console.error('检查凭据失败:', error);
      return false;
    }
  }
}

module.exports = new CredentialsService();

