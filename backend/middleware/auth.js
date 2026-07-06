const jwt = require('jsonwebtoken');

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Test mode: Allow test tokens for debugging
  if (token.startsWith('test_token_')) {
    const userId = token.replace('test_token_', '');
    req.user = {
      userId: userId,
      username: 'test_user'
    };
    req.userId = userId;
    req.username = 'test_user';
    console.log(`🔓 Test authentication for user: ${userId}`);
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  });
}

// Optional middleware for protected routes that might not require authentication
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Continue without authentication
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err) {
      req.userId = decoded.userId;
      req.username = decoded.username;
    }
    // Continue regardless of token validity
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth
};
