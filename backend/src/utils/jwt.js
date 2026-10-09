import jwt from 'jsonwebtoken';

function getJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
  }
  return process.env.JWT_SECRET;
}

export function createAccessToken(user) {
  return jwt.sign({ sub: user.id }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    issuer: 'unipath-api',
    audience: 'unipath-client',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'unipath-api',
    audience: 'unipath-client',
  });
}
