import { loginUser, publicUser, registerUser } from '../services/auth.service.js';

export async function register(request, response, next) {
  try {
    const result = await registerUser(request.body);
    response.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const result = await loginUser(request.body);
    if (!result) return response.status(401).json({ success: false, message: 'Email or password is incorrect' });
    response.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export function me(request, response) {
  response.json({ success: true, user: publicUser(request.user) });
}
