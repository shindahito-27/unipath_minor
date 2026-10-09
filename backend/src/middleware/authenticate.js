import User from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';

export async function authenticate(request, response, next) {
  const authorization = request.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = verifyAccessToken(token);
    if (typeof payload === 'string' || !payload.sub) {
      return response.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    const user = await User.findById(payload.sub).select('name email role department semester createdAt updatedAt');
    if (!user) return response.status(401).json({ success: false, message: 'Invalid or expired token' });
    request.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return response.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    next(error);
  }
}
