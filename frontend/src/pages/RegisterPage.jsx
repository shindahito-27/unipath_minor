import { useState } from 'react';
import { ArrowRight, Command, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', department: '', semester: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : user.role === 'FACULTY' ? '/faculty' : '/student'} replace />;

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setSubmitting(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, department: form.department, semester: Number(form.semester) });
      navigate('/student', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="login-brand"><span className="brand-mark"><Command size={19} /></span><span>unipath<span className="brand-period">.</span></span></div>
        <div className="login-brand-message"><span className="login-overline">CAMPUS, CONNECTED</span><h1>Start your<br />campus journey.</h1><p>Create a student account to see your timetable, quizzes, events, and notifications.</p></div>
        <div className="login-brand-footer">A better way through university.</div>
        <div className="login-decoration login-decoration-one"/><div className="login-decoration login-decoration-two"/>
      </section>
      <section className="login-form-panel">
        <form className="login-form register-form" onSubmit={handleSubmit}>
          <div className="login-mobile-brand"><span className="brand-mark"><Command size={18} /></span><strong>unipath<span className="brand-period">.</span></strong></div>
          <span className="login-overline form-overline">STUDENT PORTAL</span>
          <h2>Create your account</h2><p className="login-intro">Register with your university details to continue.</p>
          <label className="login-label" htmlFor="name">Full name</label>
          <div className="login-input-wrap"><UserRound size={17}/><input autoComplete="name" id="name" name="name" value={form.name} onChange={update} placeholder="Your name" required minLength={2} maxLength={100}/></div>
          <label className="login-label register-field-label" htmlFor="email">University email</label>
          <div className="login-input-wrap"><Mail size={17}/><input autoComplete="email" id="email" name="email" type="email" value={form.email} onChange={update} placeholder="you@university.edu" required/></div>
          <div className="register-select-grid">
            <div><label className="login-label register-field-label" htmlFor="department">Department</label><div className="login-input-wrap"><input id="department" name="department" value={form.department} onChange={update} placeholder="e.g. Computer Science" required maxLength={100}/></div></div>
            <div><label className="login-label register-field-label" htmlFor="semester">Semester</label><div className="login-input-wrap"><select id="semester" name="semester" value={form.semester} onChange={update} required><option value="" disabled>Select</option>{Array.from({ length: 16 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div></div>
          </div>
          <label className="login-label register-field-label" htmlFor="password">Password</label>
          <div className="login-input-wrap"><LockKeyhole size={17}/><input autoComplete="new-password" id="password" name="password" type="password" value={form.password} onChange={update} placeholder="At least 8 characters" required minLength={8}/></div>
          <label className="login-label register-field-label" htmlFor="confirmPassword">Confirm password</label>
          <div className="login-input-wrap"><LockKeyhole size={17}/><input autoComplete="new-password" id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} placeholder="Re-enter your password" required minLength={8}/></div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create student account'}{!submitting && <ArrowRight size={16}/>}</button>
          <p className="login-note">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
