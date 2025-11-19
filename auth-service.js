const { supabase } = require('./supabase-config');

class AuthService {
  constructor() {
    this.authStateListeners = [];
  }

  // 邮箱注册
  async signUp(email, password) {
    try {
      console.log('Starting sign up, email:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'com.electron.todolist://auth/callback'
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }
      
      console.log('Sign up response data:', data);
      
      // 检查用户是否需要邮箱确认
      const needsConfirmation = data.user && !data.user.email_confirmed_at;
      
      // 检查是否有 session（某些配置下注册后可能直接有 session）
      const hasSession = data.session !== null && data.session !== undefined;
      
      console.log('Sign up result:', {
        needsConfirmation,
        hasSession,
        userEmail: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at
      });
      
      return { 
        success: true, 
        data,
        needsConfirmation: needsConfirmation || false,
        hasSession: hasSession || false
      };
    } catch (error) {
      console.error('Sign up failed:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      return { success: false, error: error.message };
    }
  }

  // 邮箱登录
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // 特殊处理邮箱未确认错误
        if (error.code === 'email_not_confirmed') {
          return { 
            success: false, 
            error: error.message,
            code: 'email_not_confirmed',
            email: email
          };
        }
        throw error;
      }
      return { success: true, data };
    } catch (error) {
        console.error('Sign in failed:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.code || 'unknown'
      };
    }
  }

  // 重新发送确认邮件
  async resendConfirmationEmail(email) {
    try {
      console.log('Attempting to resend confirmation email to:', email);
      
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'com.electron.todolist://auth/callback'
        }
      });
      
      if (error) {
        console.error('Supabase resend error:', error);
        throw error;
      }
      
      console.log('Email sent successfully, response data:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to resend confirmation email:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      // 提供更友好的错误信息
      let errorMessage = error.message;
      if (error.status === 429) {
        errorMessage = '发送过于频繁，请稍后再试';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '发送频率过高，请稍后再试';
      } else if (error.message?.includes('not found')) {
        errorMessage = '该邮箱地址未注册或已确认';
      }
      
      return { success: false, error: errorMessage, code: error.code };
    }
  }

  // GitHub OAuth 登录
  async signInWithGitHub() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'com.electron.todolist://auth/callback'
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
        console.error('GitHub sign in failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 登出
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
        console.error('Sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 获取当前用户
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { success: true, user };
    } catch (error) {
      return { success: false, user: null, error: error.message };
    }
  }

  // 获取当前会话
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { success: true, session };
    } catch (error) {
      return { success: false, session: null, error: error.message };
    }
  }

  // 监听认证状态变化
  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return subscription;
  }

  // 处理 OAuth 回调和邮箱确认回调
  async handleOAuthCallback(url) {
    try {
      console.log('Processing callback URL:', url);
      
      // 解析 URL（处理自定义协议）
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (e) {
        // 如果URL解析失败，尝试手动解析
        const match = url.match(/^[^:]+:\/\/([^?#]+)(\?[^#]*)?(#.*)?$/);
        if (match) {
          const path = match[1];
          const search = match[2] || '';
          const hash = match[3] || '';
          urlObj = {
            searchParams: new URLSearchParams(search.replace('?', '')),
            hash: hash.replace('#', ''),
            pathname: path
          };
        } else {
          throw new Error('无法解析URL');
        }
      }
      
      // 首先尝试处理hash参数（OAuth和邮箱确认都可能使用）
      if (url.includes('#')) {
        const hashPart = url.split('#')[1];
        const hashParams = new URLSearchParams(hashPart);
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          
          if (error) throw error;
          return { success: true, data, type: type === 'signup' ? 'email_confirmation' : 'oauth' };
        }
      }
      
      // 处理查询参数
      const searchParams = urlObj.searchParams || new URLSearchParams(urlObj.search?.replace('?', '') || '');
      const type = searchParams.get('type');
      const token = searchParams.get('token');
      const tokenHash = searchParams.get('token_hash');
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');
      
      // 如果是邮箱确认回调（使用token或token_hash）
      if (type === 'signup' && (token || tokenHash)) {
        try {
          // 尝试使用verifyOtp验证
          const verifyResult = await supabase.auth.verifyOtp({
            token_hash: tokenHash || token,
            type: 'signup'
          });
          
          if (verifyResult.error) throw verifyResult.error;
          return { success: true, data: verifyResult.data, type: 'email_confirmation' };
        } catch (verifyError) {
          console.warn('verifyOtp failed, trying alternative method:', verifyError);
          // 如果verifyOtp失败，可能token已经在URL中，尝试直接设置session
        }
      }
      
      // 如果有access_token和refresh_token，直接设置session
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token
        });
        
        if (error) throw error;
        return { success: true, data, type: type === 'signup' ? 'email_confirmation' : 'oauth' };
      }
      
      return { success: false, error: '缺少认证参数' };
    } catch (error) {
      console.error('Callback handling failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AuthService();

