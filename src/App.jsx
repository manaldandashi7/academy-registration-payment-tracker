import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import LevelPage from './components/LevelPage.jsx';
import IncomeReport from './components/IncomeReport.jsx';
import BalancePage from './components/BalancePage.jsx';
import PaymentsPage from './components/PaymentsPage.jsx';
import ExpensesReport from './components/ExpensesReport.jsx';
import StudentModal from './components/StudentModal.jsx';
import PaymentModal from './components/PaymentModal.jsx';
import ExpenseModal from './components/ExpenseModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { useLanguage } from './i18n.jsx';
import { useDialog } from './dialog.jsx';

const isValidAcademyName = (value) => {
  if (!value) return false;
  const trimmed = String(value).trim();
  return trimmed.length > 0 && trimmed !== 'Your Academy' && trimmed !== 'My Academy';
};

const VALID_VIEW = /^(dashboard|payments|balance|income|expenses|level-[1-4])$/;

// Signed out automatically after this long without anyone using the app in
// this browser, even with "Remember me" ticked.
const INACTIVITY_LIMIT_MS = 14 * 24 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = 'mahara.lastActive';

function inactiveTooLong() {
  try {
    const last = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    return last > 0 && Date.now() - last > INACTIVITY_LIMIT_MS;
  } catch {
    return false;
  }
}

// The current page (Dashboard / a level / Income / Expenses) lives in the URL's
// hash, e.g. "#/level-2" - not just in memory. That's what makes the browser's
// back/forward buttons step through the pages you've actually visited, the way
// they do on any normal site, instead of doing nothing.
function isWelcomeHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return h === '' || h === 'welcome';
}

function viewFromHash() {
  if (typeof window === 'undefined') return 'dashboard';
  const h = window.location.hash.replace(/^#\/?/, '');
  return VALID_VIEW.test(h) ? h : 'dashboard';
}

export default function App() {
  const { t, dir } = useLanguage();
  const { confirm, notify } = useDialog();
  const [session, setSession] = useState(undefined); // undefined = not checked yet
  const [academyEntered, setAcademyEntered] = useState(false);
  const setupCompletedKey = 'academySetupCompleted';
  const [view, setView] = useState(viewFromHash);
  const [students, setStudents] = useState([]); // active only - what every roster/count uses
  const [allStudents, setAllStudents] = useState([]); // includes archived, for payment history
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ academy_name: 'Your Academy', logo_url: null, address: '', phone: '', owner_name: '' });
  const [loadError, setLoadError] = useState('');

  const [studentModal, setStudentModal] = useState(null); // { student, presetLevel } | null
  const [paymentModalStudentId, setPaymentModalStudentId] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null); // an existing payment row being viewed/edited
  const [expenseModal, setExpenseModal] = useState(null); // { expense } | null
  const [settingsOpen, setSettingsOpen] = useState(false);
  // True once the first load has finished for the current sign-in - lets the
  // dashboard show a loading state instead of briefly flashing "no students yet"
  // before the real data arrives. Later, realtime-triggered reloads don't touch
  // this again, so those stay silent instead of re-showing the loading state.
  const [dataLoaded, setDataLoaded] = useState(false);

  // ---- auth ----
  useEffect(() => {
    setAcademyEntered(false);
    let cancelled = false;
    let listener = null;
    const start = () => {
      if (cancelled) return;
      supabase.auth.getSession().then(({ data }) => { if (!cancelled) setSession(data.session); });
      listener = supabase.auth.onAuthStateChange((_event, s) => setSession(s)).data;
    };
    // A remembered session would otherwise last forever. If this browser
    // hasn't been used for INACTIVITY_LIMIT_MS, sign out first so the next
    // person to open it has to log in again.
    if (inactiveTooLong()) supabase.auth.signOut({ scope: 'local' }).finally(start);
    else start();
    return () => {
      cancelled = true;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Record "last used" while signed in - on load and on any click/keypress,
  // written at most once a minute. inactiveTooLong() above reads it.
  useEffect(() => {
    if (!session) return;
    let lastWrite = 0;
    const touch = () => {
      const now = Date.now();
      if (now - lastWrite < 60_000) return;
      lastWrite = now;
      try { localStorage.setItem(LAST_ACTIVE_KEY, String(now)); } catch { /* storage blocked */ }
    };
    touch();
    window.addEventListener('pointerdown', touch);
    window.addEventListener('keydown', touch);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, [session]);

  // ---- keep `view` and the URL hash in sync, so back/forward work ----
  // The welcome screen is a page in the history too ("#/welcome", or no hash
  // at all): pressing Back from the first page inside the academy lands on it,
  // and Forward from it goes back in.
  useEffect(() => {
    const onHashChange = () => {
      if (isWelcomeHash()) {
        setAcademyEntered(false);
      } else {
        setView(viewFromHash());
        setAcademyEntered(true);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Back/Forward on the login screen can fire the listener above too - while
  // signed out, never count as "entered", so signing in still shows welcome.
  useEffect(() => {
    if (!session) setAcademyEntered(false);
  }, [session, academyEntered]);

  // "Start" on the welcome screen. Makes sure there's a welcome entry right
  // behind the page being entered, so Back returns to the welcome screen.
  function enterAcademy() {
    if (isWelcomeHash()) {
      window.location.hash = '/dashboard'; // pushes a new entry after the welcome one
    } else {
      // Reloaded on e.g. "#/level-2": turn this entry into the welcome one,
      // then push the page that was open, so Back still has somewhere to go.
      const current = viewFromHash();
      window.history.replaceState(null, '', '#/welcome');
      window.history.pushState(null, '', `#/${current}`);
      setView(current);
    }
    setAcademyEntered(true);
  }

  // Changing the hash is what actually creates the browser-history entry;
  // the hashchange listener above then updates `view` to match. Sidebar links,
  // "Your levels" cards etc. should all call this instead of setView directly.
  function navigate(next) {
    if (window.location.hash.replace(/^#\/?/, '') === next) {
      setView(next);
    } else {
      window.location.hash = `/${next}`;
    }
  }

  // ---- data loading + realtime, once signed in ----
  const loadAll = useCallback(async (isRetry = false) => {
    setLoadError('');
    try {
    const [studentsRes, paymentsRes, expensesRes, settingsRes] = await Promise.all([
      // All students, archived included: the Payments page still needs the
      // names behind an archived student's past payments. Everything else
      // uses the active-only list derived from this below.
      supabase.from('students').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
      // No .eq() filter here on purpose: the database's own rules only ever
      // return this signed-in academy's own row, so there is at most one.
      supabase.from('settings').select('*').maybeSingle(),
    ]);

    // A request can transiently fail with a JWT complaint (e.g. "JWT issued at
    // future") right around a background token refresh - usually just a tiny
    // clock skew on this machine, gone a moment later. Rather than show a
    // scary banner for something that normally isn't a real problem, refresh
    // the session and retry the whole load once before giving up.
    const results = [studentsRes, paymentsRes, expensesRes, settingsRes];
    const hasAuthError = results.some((r) => r.error && /jwt/i.test(r.error.message));
    if (hasAuthError && !isRetry) {
      await supabase.auth.refreshSession();
      await loadAll(true);
      return;
    }

    if (studentsRes.error) setLoadError(studentsRes.error.message);
    else {
      setAllStudents(studentsRes.data || []);
      setStudents((studentsRes.data || []).filter((s) => s.active));
    }

    if (paymentsRes.error) setLoadError(paymentsRes.error.message);
    else setPayments(paymentsRes.data || []);

    // Ignore a missing-table error here rather than showing a banner: it just
    // means expenses.sql hasn't been run in this Supabase project yet, and the
    // rest of the app should keep working normally either way.
    if (expensesRes.error) {
      if (!/relation .*expenses.* does not exist/i.test(expensesRes.error.message)) {
        setLoadError(expensesRes.error.message);
      }
    } else {
      setExpenses(expensesRes.data || []);
    }

    const academyNameFromProfile = session?.user?.user_metadata?.academy_name;
    const hasRealAcademySettings = !!settingsRes.data && isValidAcademyName(settingsRes.data.academy_name);

    if (hasRealAcademySettings) {
      if (typeof window !== 'undefined' && session?.user?.id) {
        localStorage.setItem(setupCompletedKey, session.user.id);
      }
      setSettings({ ...settingsRes.data, academy_name: settingsRes.data.academy_name.trim() });
      setSettingsOpen(false);
      return;
    }

    const defaultSettings = {
      academy_name: isValidAcademyName(academyNameFromProfile) ? academyNameFromProfile : 'Your Academy',
      logo_url: null,
      address: '',
      phone: '',
      owner_name: '',
    };

    setSettings(defaultSettings);
    setSettingsOpen(true);

    if (!settingsRes.data && session?.user?.id) {
      // owner_id ties this row to the signed-in academy; onConflict lets a
      // later save update it instead of trying to insert a second row.
      await supabase.from('settings').upsert({ ...defaultSettings, owner_id: session.user.id }, { onConflict: 'owner_id' });
    }
    } finally {
      setDataLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    setDataLoaded(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;
    loadAll();

    const channel = supabase
      .channel('academy-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, loadAll)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, loadAll]);

  useEffect(() => {
    if (typeof window === 'undefined' || !session?.user?.id) return;
    if (isValidAcademyName(settings?.academy_name)) {
      localStorage.setItem(setupCompletedKey, session.user.id);
    }
  }, [settings?.academy_name, setupCompletedKey, session?.user?.id]);

  if (session === undefined) return null; // brief auth check, avoids a flash of the login screen

  if (!session) {
    return (
      <Login
        // Separate keys for the signed-out and signed-in Login screens, so
        // signing out from the welcome screen starts fresh at the login form
        // instead of React keeping the old one's "welcome" state.
        key="signed-out"
        settings={settings}
        onEnteredAcademy={enterAcademy}
        onAcademyConfigured={(nextSettings) => {
          setSettings(nextSettings);
          enterAcademy();
        }}
      />
    );
  }

  // ?devsetup=1 forces the setup screen back open even for an already-configured
  // academy, which is handy for re-testing it; it is not the normal trigger.
  const forceSetup = typeof window !== 'undefined' && window.location.search.includes('devsetup=1');
  // The flag's value is this academy's own user id, not just "true" - so a
  // different account signing in on the same browser is never mistaken for one
  // that has already completed setup (see the matching localStorage.setItem calls
  // in Login.jsx and SettingsModal.jsx, which store session.user.id the same way).
  const hasCompletedSetup = typeof window !== 'undefined' ? localStorage.getItem(setupCompletedKey) === session.user.id : false;
  const isAcademyConfigured = isValidAcademyName(settings?.academy_name) || hasCompletedSetup;
  const needsAcademySetup = forceSetup || !isAcademyConfigured;

  if (!academyEntered) {
    return (
      <Login
        key="signed-in"
        settings={settings}
        mode={needsAcademySetup ? 'setup' : 'welcome'}
        onEnteredAcademy={enterAcademy}
        onSignOut={() => supabase.auth.signOut()}
        onAcademyConfigured={(nextSettings) => {
          // Deliberately not setting academyEntered here: Login already switches
          // itself to its own welcome screen once setup is saved, so the user
          // sees that (with the name/logo they just entered) before pressing
          // Start, which is what actually enters the dashboard.
          setSettings(nextSettings);
        }}
      />
    );
  }

  async function handleArchiveStudent(student) {
    const ok = await confirm({ title: t('archive'), message: t('archive_confirm', { name: student.name }), confirmLabel: t('archive') });
    if (!ok) return;
    const { error } = await supabase.from('students').update({ active: false }).eq('id', student.id);
    if (error) notify({ message: t('archive_failed', { msg: error.message }), danger: true });
  }

  async function handleDeleteStudent(student) {
    const count = payments.filter((p) => p.student_id === student.id).length;
    const ok = await confirm({
      title: t('delete_student'),
      message: t('delete_student_confirm', { name: student.name, count }),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;
    // Deleting the student also deletes their payments automatically (the
    // payments table's foreign key to students is set to cascade on delete).
    const { error } = await supabase.from('students').delete().eq('id', student.id);
    if (error) notify({ message: t('delete_failed', { msg: error.message }), danger: true });
  }

  async function handleDeletePayment(payment) {
    const student = allStudents.find((s) => s.id === payment.student_id);
    const ok = await confirm({
      title: t('delete_payment'),
      message: t('delete_payment_confirm', {
        name: student?.name || '—',
        amount: payment.amount != null ? Number(payment.amount).toFixed(0) : '—',
      }),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;
    const { error } = await supabase.from('payments').delete().eq('id', payment.id);
    if (error) notify({ message: t('delete_failed', { msg: error.message }), danger: true });
  }

  async function handleDeleteExpense(expense) {
    const category = t(`cat_${expense.category}`) || expense.category;
    const ok = await confirm({
      message: t('delete_expense_confirm', { category, amount: Number(expense.amount).toFixed(0) }),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) notify({ message: t('delete_failed', { msg: error.message }), danger: true });
  }

  const paymentModalStudent = paymentModalStudentId
    ? students.find((s) => s.id === paymentModalStudentId)
    : null;

  return (
    <div className="app" dir={dir}>
      <Sidebar
        view={view}
        students={students}
        onNavigate={navigate}
        settings={settings}
        onAddStudent={(level) => setStudentModal({ student: null, presetLevel: level })}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={() => {
          setAcademyEntered(false);
          if (!session) return;
          supabase.auth.signOut();
        }}
      />

      <main>
        {loadError && <div className="banner error">{t('load_error', { msg: loadError })}</div>}

        {!dataLoaded ? (
          <div className="loading-state">
            <div className="spinner" aria-hidden="true" />
            <p>{t('loading')}</p>
          </div>
        ) : (
          <>

        {view === 'dashboard' && (
          <Dashboard
            students={students}
            payments={payments}
            academyName={settings.academy_name}
            onRecordPayment={(id) => setPaymentModalStudentId(id)}
            onAddStudent={(level) => setStudentModal({ student: null, presetLevel: level })}
            onNavigate={navigate}
            onEditStudent={(student) => setStudentModal({ student, presetLevel: null })}
            onArchiveStudent={handleArchiveStudent}
            onDeleteStudent={handleDeleteStudent}
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
            onDeleteStudent={handleDeleteStudent}
            onRecordPayment={(id) => setPaymentModalStudentId(id)}
          />
        )}

        {view === 'payments' && (
          <PaymentsPage
            payments={payments}
            students={allStudents}
            onEditPayment={(payment) => setEditingPayment(payment)}
            onDeletePayment={handleDeletePayment}
          />
        )}

        {view === 'income' && <IncomeReport payments={payments} expenses={expenses} />}

        {view === 'balance' && <BalancePage students={students} payments={payments} expenses={expenses} />}

        {view === 'expenses' && (
          <ExpensesReport
            expenses={expenses}
            onAddExpense={() => setExpenseModal({ expense: null })}
            onEditExpense={(expense) => setExpenseModal({ expense })}
            onDeleteExpense={handleDeleteExpense}
          />
        )}
          </>
        )}
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

      {editingPayment && (
        <PaymentModal
          payment={editingPayment}
          student={allStudents.find((s) => s.id === editingPayment.student_id)}
          payments={payments}
          onClose={() => setEditingPayment(null)}
        />
      )}

      {expenseModal && (
        <ExpenseModal
          expense={expenseModal.expense}
          onClose={() => setExpenseModal(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onAcademyProfileDeleted={() => {
            setSession(null);
            setSettings({ academy_name: 'Your Academy', logo_url: null, address: '', phone: '', owner_name: '' });
            setAcademyEntered(false);
            setSettingsOpen(false);
            if (typeof window !== 'undefined') {
              localStorage.removeItem(setupCompletedKey);
            }
          }}
        />
      )}
    </div>
  );
}
