const LOCAL_OWNER_ID = 'local-user-scoremap-t03';

function authFromRequest(request, options = {}) {
  const orderToken = request.headers['x-order-token'] || null;
  const authHeader = String(request.headers.authorization || request.headers.Authorization || '');
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (bearerToken) {
    const user = options.authService && options.authService.verifyToken(bearerToken);
    if (user) {
      return {
        authenticated: true,
        ownerId: user.id,
        openid: user.openid || null,
        user,
        orderToken
      };
    }
    return {
      authenticated: false,
      ownerId: null,
      openid: null,
      invalidToken: true,
      orderToken
    };
  }

  const authState = String(request.headers['x-local-auth-state'] || 'local-owner');
  if (authState === 'anonymous') {
    return {
      authenticated: false,
      ownerId: null,
      orderToken
    };
  }

  return {
    authenticated: true,
    ownerId: request.headers['x-local-user-id'] || LOCAL_OWNER_ID,
    orderToken
  };
}

function unauthorized(message = 'Local login is required for this protected resource.') {
  return {
    statusCode: 401,
    body: { status: 'error', code: 'UNAUTHENTICATED', message }
  };
}

module.exports = {
  authFromRequest,
  LOCAL_OWNER_ID,
  unauthorized
};
