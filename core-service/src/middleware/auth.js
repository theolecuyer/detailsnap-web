import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header', code: 'UNAUTHORIZED' });
  }
  const token = auth.slice(7);
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: claims.user_id,
      shopId: claims.shop_id,
      role: claims.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Owner role required', code: 'FORBIDDEN' });
  }
  next();
}
