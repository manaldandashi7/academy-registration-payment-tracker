import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import LevelPage from './components/LevelPage.jsx';
import IncomeReport from './components/IncomeReport.jsx';
import StudentModal from './components/StudentModal.jsx';
import PaymentModal from './components/PaymentModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = not checked yet
  const [view, setView] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [settings, setSettings] = useState({ academy_name: 'Your Academy', logo_url: null });
  const [loadError, setLoadError] = useState('');

  const [studentModal, setStudentModal] = useState(null); // { student, presetLevel } | null
  const [paymentModalStudentId, setPaymentModalStudentId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ---- auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // ---- data loading + realtime, once signed in ----
  const loadAll = useCallback(async () => {
    setLoadError('');
    const [studentsRes, paymentsRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*').eq('active', true),
      supabase.from('payments').select('*'),
      supabase.from('settings').select('*').eq('id', 'general').maybeSingle(),
    ]);
    if (studentsRes.error) setLoadError(studentsRes.error.message);
    else setStudents(studentsRes.data || []);

    if (paymentsRes.error) setLoadError(paymentsRes.error.message);
    else setPayments(paymentsRes.data || []);

    if (settingsRes.data) setSettings(settingsRes.data);
  }, []);

  useEffect(() => {
    if (!session) return;
    loadAll();

    const channel = supabase
      .channel('academy-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, loadAll)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, loadAll]);

  if (session === undefined) return null; // brief auth check, avoids a flash of the login screen
  if (!session) return <Login />;

  async function handleArchiveStudent(student) {
    if (!confirm(`Archive ${student.name}? They'll be hidden from lists but payment history is kept.`)) return;
    const { error } = await supabase.from('students').update({ active: false }).eq('id', student.id);
    if (error) alert("Couldn't archive right now: " + error.message);
  }

  const paymentModalStudent = paymentModalStudentId
    ? students.find((s) => s.id === paymentModalStudentId)
    : null;

  return (
    <div className="app">
      <Sidebar
        view={view}
        onNavigate={setView}
        settings={settings}
        onAddStudent={(level) => setStudentModal({ student: null, presetLevel: level })}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={() => supabase.auth.signOut()}
      />

      <main>
        {loadError && <div className="banner error">Couldn't load data: {loadError}</div>}

        {view === 'dashboard' && (
          <Dashboard
            students={students}
            payments={payments}
            academyName={settings.academy_name}
            onRecordPayment={(id) => setPaymentModalStudentId(id)}
          />
        )}

        {view.startsWith('level-') && (
          <LevelPage
            level={Number(view.split('-')[1])}
            students={students}
            payments={payments}
            academyName={settings.academy_name}
            onAddStudent={(level) => setStudentModal({ student: null, presetLevel: level })}
            onEditStudent={(student) => setStudentModal({ student, presetLevel: null })}
            onArchiveStudent={handleArchiveStudent}
            onRecordPayment={(id) => setPaymentModalStudentId(id)}
          />
        )}

        {view === 'income' && <IncomeReport payments={payments} />}
      </main>

      {studentModal && (
        <StudentModal
          student={studentModal.student}
          presetLevel={studentModal.presetLevel}
          onClose={() => setStudentModal(null)}
        />
      )}

      {paymentModalStudent && (
        <PaymentModal
          student={paymentModalStudent}
          payments={payments}
          onClose={() => setPaymentModalStudentId(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal settings={settings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
