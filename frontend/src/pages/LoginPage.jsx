import { useState } from 'react';
import { ArrowRight, Command, LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleDestination = { ADMIN: '/admin', FACULTY: '/faculty', STUDENT: '/student' };

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={roleDestination[user.role] || '/'} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      navigate(roleDestination[loggedInUser.role] || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand"><span className="brand-mark"><Command size={19} /></span><span>unipath<span className="brand-period">.</span></span></div>
        <div className="login-brand-message"><span className="login-overline">CAMPUS, CONNECTED</span><h1>Your campus.<br />One clear path.</h1><p>Academic operations and campus life, brought together in one place.</p></div>
        <div className="login-brand-footer">A better way through university.</div>
        <div className="login-decoration login-decoration-one"/><div className="login-decoration login-decoration-two"/>
      </section>
      <section className="login-form-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-mobile-brand"><span className="brand-mark"><Command size={18} /></span><strong>unipath<span className="brand-period">.</span></strong></div>
          <span className="login-overline form-overline">YOUR CAMPUS WORKSPACE</span>
          <h2>Welcome back</h2><p className="login-intro">Sign in with your university account to continue.</p>
          <label className="login-label" htmlFor="email">University email</label>
          <div className="login-input-wrap"><Mail size={17}/><input autoComplete="username" id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" required /></div>
          <label className="login-label password-label" htmlFor="password">Password</label>
          <div className="login-input-wrap"><LockKeyhole size={17}/><input autoComplete="current-password" id="password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}{!submitting && <ArrowRight size={16}/>}</button>
          <p className="login-note">New student? <Link to="/register">Create an account</Link></p>
        </form>
      </section>
    </main>
  );
}
