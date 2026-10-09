import { GraduationCap, Sparkles } from 'lucide-react';

export default function FacultyDashboard() {
  return (
    <div className="dashboard-page">
      <div className="page-heading-row"><div><div className="eyebrow">FACULTY PORTAL</div><h1>Welcome to your workspace <span className="wave">✳</span></h1><p className="page-subtitle">Your academic workspace is ready to connect.</p></div></div>
      <section className="panel faculty-welcome"><div className="student-card-icon violet"><GraduationCap size={20}/></div><h2>Everything in one place</h2><p>Faculty tools and academic updates will appear here when connected to your campus systems.</p><div className="faculty-ready"><Sparkles size={15}/> Faculty workspace</div></section>
      <div className="footer-note"><span className="status-dot" /> UniPath faculty workspace</div>
    </div>
  );
}
