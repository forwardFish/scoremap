const LOCAL_OWNER_ID = 'local-user-scoremap-t03';

function authFromRequest(request) {
  const authState = String(request.headers['x-local-auth-state'] || 'local-owner');
  if (authState === 'anonymous') {
    return {
      authenticated: false,
      ownerId: null,
      orderToken: request.headers['x-order-token'] || null
    };
  }

  return {
    authenticated: true,
    ownerId: request.headers['x-local-user-id'] || LOCAL_OWNER_ID,
    orderToken: request.headers['x-order-token'] || null
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
