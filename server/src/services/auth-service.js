const crypto = require('node:crypto');
const https = require('node:https');

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

function readHttpsJson(url, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      timeout: timeoutMs,
      headers: { accept: 'application/json' }
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        let data = {};
        try {
          data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        } catch {
          data = {};
        }
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode,
          data
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error('wechat code2Session request timed out')));
    request.on('error', reject);
  });
}

function friendlyWechatSessionError(data = {}) {
  const errcode = Number(data.errcode || 0);
  const errmsg = String(data.errmsg || '').trim();
  const normalized = errmsg.toLowerCase();
  if (normalized.includes('resource is not found') || normalized.includes('reource is not found')) {
    return 'WeChat code2Session resource was not found. Check WECHAT_APP_ID/WECHAT_APP_SECRET and mini-program binding.';
  }
  if (errcode === 40029) return 'WeChat login code is invalid or expired; please retry login.';
  if (errcode === 40125) return 'WeChat AppSecret is invalid; check WECHAT_APP_SECRET.';
  if (errcode === 40013) return 'WeChat AppID is invalid; check WECHAT_APP_ID.';
  return `wechat code2Session failed: ${errcode || 'unknown'} ${errmsg}`.trim();
}

class AuthService {
  constructor({ db, env, fetchImpl = globalThis.fetch, httpsJsonImpl = readHttpsJson } = {}) {
    if (!db) throw new Error('AuthService requires db.');
    if (!env) throw new Error('AuthService requires env.');
    this.db = db;
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.httpsJsonImpl = httpsJsonImpl;
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
    const url = new URL(CODE2SESSION_URL);
    url.searchParams.set('appid', this.env.wechatAppId);
    url.searchParams.set('secret', this.env.wechatAppSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    let result;
    try {
      if (typeof this.fetchImpl !== 'function') throw new Error('fetch is not available');
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.env.requestTimeoutMs || 10000)
      });
      result = {
        ok: response.ok,
        status: response.status,
        data: await response.json().catch(() => ({}))
      };
    } catch (error) {
      try {
        result = await this.httpsJsonImpl(url, { timeoutMs: this.env.requestTimeoutMs || 10000 });
      } catch (fallbackError) {
        throw httpError(
          `wechat code2Session request failed after fetch/https fallback: ${fallbackError.message || error.message}`,
          502,
          'WECHAT_NETWORK_ERROR'
        );
      }
    }
    const data = result.data || {};
    if (!result.ok) {
      throw httpError(`wechat code2Session HTTP ${result.status}`, 502, 'WECHAT_HTTP_ERROR');
    }
    if (data.errcode) {
      throw httpError(friendlyWechatSessionError(data), 401, 'WECHAT_CODE_INVALID');
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
  friendlyWechatSessionError,
  publicUser
};
