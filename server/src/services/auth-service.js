const crypto = require('node:crypto');

const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

function createId(prefix = 'user') {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${crypto.randomBytes(12).toString('hex')}`;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function publicUser(user) {
  if (!user) return null;
  const { sessionKey, ...safeUser } = user;
  return safeUser;
}

function httpError(message, statusCode = 400, code = 'AUTH_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

class AuthService {
  constructor({ db, env, fetchImpl = globalThis.fetch } = {}) {
    if (!db) throw new Error('AuthService requires db.');
    if (!env) throw new Error('AuthService requires env.');
    this.db = db;
    this.env = env;
    this.fetchImpl = fetchImpl;
  }

  createToken(user) {
    const payload = base64url(JSON.stringify({
      userId: user.id,
      openid: user.openid,
      iat: Date.now()
    }));
    return `${payload}.${sign(payload, this.env.authSecret)}`;
  }

  verifyToken(token) {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    if (!safeEqual(sign(payload, this.env.authSecret), signature)) return null;
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
    if (!parsed.userId) return null;
    return publicUser(this.findUserById(parsed.userId));
  }

  async login(input = {}) {
    const mockOpenid = String(input.mockOpenid || '').trim();
    if (this.env.nodeEnv === 'production' && mockOpenid) {
      throw httpError('mockOpenid is disabled in production.', 400, 'MOCK_OPENID_FORBIDDEN');
    }
    const code = String(input.code || '').trim();
    if (!mockOpenid && !code) {
      throw httpError('wechat login code is required.', 400, 'WECHAT_CODE_REQUIRED');
    }

    const session = mockOpenid
      ? { openid: mockOpenid, unionid: '', session_key: '' }
      : await this.exchangeWechatCode(code);
    const openid = String(session.openid || '').trim();
    if (!openid) throw httpError('wechat code2Session response missing openid.', 502, 'WECHAT_OPENID_MISSING');

    const userInfo = input.userInfo || {};
    const now = new Date().toISOString();
    let user = this.findUserByOpenid(openid);
    const patch = {
      openid,
      unionid: session.unionid || (user && user.unionid) || '',
      sessionKey: session.session_key || (user && user.sessionKey) || '',
      sessionKeyUpdatedAt: session.session_key ? now : (user && user.sessionKeyUpdatedAt) || null,
      nickname: cleanText(userInfo.nickName || userInfo.nickname || (user && user.nickname) || '', 40),
      avatarUrl: cleanText(userInfo.avatarUrl || (user && user.avatarUrl) || '', 500),
      role: (user && user.role) || 'parent_owner',
      displayName: cleanText(userInfo.nickName || userInfo.nickname || (user && user.displayName) || 'Scoremap parent', 80),
      lastLoginAt: now
    };
    const firstLogin = !user;
    if (user) {
      user = this.db.update('users', user.id, patch);
    } else {
      user = this.db.insert('users', {
        id: input.userId || createId('user'),
        ...patch
      });
    }

    return {
      status: 'ok',
      token: this.createToken(user),
      user: publicUser(user),
      firstLogin
    };
  }

  async exchangeWechatCode(code) {
    if (!this.env.wechatAppId || !this.env.wechatAppSecret) {
      throw httpError('WECHAT_APP_ID/WECHAT_APP_SECRET is not configured.', 500, 'WECHAT_CONFIG_MISSING');
    }
    if (typeof this.fetchImpl !== 'function') {
      throw httpError('fetch is not available for wechat code2Session.', 500, 'FETCH_UNAVAILABLE');
    }
    const url = new URL(CODE2SESSION_URL);
    url.searchParams.set('appid', this.env.wechatAppId);
    url.searchParams.set('secret', this.env.wechatAppSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.env.requestTimeoutMs || 10000)
      });
    } catch (error) {
      throw httpError(`wechat code2Session request failed: ${error.message}`, 502, 'WECHAT_NETWORK_ERROR');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw httpError(`wechat code2Session HTTP ${response.status}`, 502, 'WECHAT_HTTP_ERROR');
    }
    if (data.errcode) {
      throw httpError(`wechat code2Session failed: ${data.errcode} ${data.errmsg || ''}`.trim(), 401, 'WECHAT_CODE_INVALID');
    }
    return data;
  }

  findUserByOpenid(openid) {
    return this.db.find('users', (row) => row.openid === openid)[0] || null;
  }

  findUserById(userId) {
    return this.db.read('users', userId);
  }
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

module.exports = {
  AuthService,
  CODE2SESSION_URL,
  publicUser
};
