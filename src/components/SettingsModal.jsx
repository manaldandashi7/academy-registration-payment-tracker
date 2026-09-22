import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';
import { useDialog } from '../dialog.jsx';
import { validateProfile, image as validateImage, passwordLength, errText, LIMITS } from '../lib/validate';

export default function SettingsModal({ settings, onClose, onAcademyProfileDeleted }) {
  const { t } = useLanguage();
  const { confirm, notify } = useDialog();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(settings.academy_name || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [ownerName, setOwnerName] = useState(settings.owner_name || '');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo_url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordStep, setPasswordStep] = useState('verify');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [archivedStudents, setArchivedStudents] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveActionId, setArchiveActionId] = useState(null);

  const passwordStrength = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const passwordMeter = [
    { key: 'pw_8', valid: password.length >= 8 },
    { key: 'pw_lower', valid: /[a-z]/.test(password) },
    { key: 'pw_upper', valid: /[A-Z]/.test(password) },
    { key: 'pw_number', valid: /\d/.test(password) },
    { key: 'pw_symbol', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  async function getProfileColumns() {
    const supported = {
      address: true,
      phone: true,
      owner_name: true,
    };

    for (const field of Object.keys(supported)) {
      try {
        const { error } = await supabase.from('settings').select(field).limit(1);
        if (error && /column .* does not exist/i.test(error.message)) {
          supported[field] = false;
        }
      } catch {
        supported[field] = false;
      }
    }

    return supported;
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be picked again after a rejection
    if (!file) return;

    const checked = await validateImage(file);
    if (checked.error) {
      setError(errText(t, checked.error));
      return;
    }

    setError('');
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError('');

    const profile = validateProfile({ name, ownerName, phone, address });
    if (profile.error) {
      setError(errText(t, profile.error));
      return;
    }

    setSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const ownerId = userData?.user?.id;
      if (userError || !ownerId) throw userError || new Error('No signed-in account');

      let uploadUrl = settings.logo_url || null;

      if (logoFile) {
        // Re-check at upload time; the extension and content type come from the
        // verified file contents, never from the user-supplied file name.
        const checked = await validateImage(logoFile);
        if (checked.error) throw new Error(errText(t, checked.error));
        // Folder-scoped so this academy can only ever write inside its own logo folder.
        const filePath = `${ownerId}/academy-logo-${Date.now()}.${checked.value.ext}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, logoFile, {
          upsert: true,
          cacheControl: '3600',
          contentType: checked.value.contentType,
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
        uploadUrl = data.publicUrl;
      }

      const supportedColumns = await getProfileColumns();
      const payload = {
        owner_id: ownerId,
        academy_name: profile.value.academy_name || 'Your Academy',
        logo_url: uploadUrl,
      };

      if (supportedColumns.address) payload.address = profile.value.address;
      if (supportedColumns.phone) payload.phone = profile.value.phone;
      if (supportedColumns.owner_name) payload.owner_name = profile.value.owner_name;

      const { error: upsertError } = await supabase.from('settings').upsert(payload, { onConflict: 'owner_id' });
      if (upsertError) throw upsertError;

      if (typeof window !== 'undefined') {
        // Scoped to this account's id, not just "true" - see App.jsx for why.
        localStorage.setItem('academySetupCompleted', ownerId);
      }

      onClose();
    } catch (err) {
      setError(err.message || t('err_save'));
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyCurrentPassword() {
    if (!oldPassword.trim()) {
      setError(t('err_enter_current'));
      return;
    }

    setError('');
    setPasswordSaving(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const accountEmail = userData?.user?.email;
      if (userError || !accountEmail) throw userError || new Error('No signed-in account');

      // Actually check the password by signing in with it again.
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email: accountEmail, password: oldPassword });

      if (reauthError) {
        throw reauthError;
      }

      setPasswordVerified(true);
      setPasswordStep('new');
      setOldPassword('');
      setVerificationMessage(t('verified_msg'));
      setError('');
    } catch (err) {
      setPasswordVerified(false);
      setPasswordStep('verify');

      const message = err?.message || '';
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many requests')) {
        setError(t('err_rate_limit'));
      } else {
        setError(t('err_wrong_current'));
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!passwordVerified || passwordStep !== 'new') {
      setError(t('err_verify_first'));
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setError(t('err_enter_new'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('err_no_match'));
      return;
    }

    const lengthCheck = passwordLength(password);
    if (lengthCheck.error) {
      setError(errText(t, lengthCheck.error));
      return;
    }

    if (!passwordStrength.test(password)) {
      setError(t('err_weak'));
      return;
    }

    setError('');
    setPasswordSaving(true);

    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      setOldPassword('');
      setPassword('');
      setConfirmPassword('');
      setPasswordVerified(false);
      setPasswordStep('verify');
      setShowPasswordModal(false);
      setError('');
      setVerificationMessage('');
      notify({ message: t('pw_updated') });
    } catch (err) {
      const message = err?.message || '';
      if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many requests')) {
        setError(t('err_rate_limit'));
      } else {
        setError(err.message || t('err_pw_update'));
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAcademyProfile() {
    const confirmed = await confirm({
      title: t('delete_account'),
      message: t('delete_confirm'),
      danger: true,
      confirmLabel: t('delete'),
    });

    if (!confirmed) return;

    setError('');
    setDeleting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData?.user?.id;

      if (settings.logo_url) {
        try {
          const url = new URL(settings.logo_url);
          // Keep the full object path (e.g. "<uid>/academy-logo-....png"), not just
          // the last segment, so logos stored inside an owner folder are found.
          const marker = '/object/public/logos/';
          const idx = url.pathname.indexOf(marker);
          const objectPath = idx >= 0 ? decodeURIComponent(url.pathname.slice(idx + marker.length)) : '';
          if (objectPath) {
            const { error: storageError } = await supabase.storage.from('logos').remove([objectPath]);
            // Best-effort cleanup: a missing file, or a pre-migration logo saved
            // outside any owner folder that this account can no longer touch,
            // should never block deleting the account itself.
            if (storageError) {
              // eslint-disable-next-line no-console
              console.warn('Could not remove logo file during account deletion:', storageError.message);
            }
          }
        } catch {
          // ignore URL parsing issues and continue with the account cleanup
        }
      }

      const { data: studentsData, error: studentsError } = await supabase.from('students').select('id');
      if (studentsError) throw studentsError;

      const studentIds = (studentsData || []).map((row) => row.id);
      if (studentIds.length > 0) {
        const { error: deleteStudentsError } = await supabase.from('students').delete().in('id', studentIds);
        if (deleteStudentsError) throw deleteStudentsError;
      }

      const { data: paymentsData, error: paymentsError } = await supabase.from('payments').select('id');
      if (paymentsError) throw paymentsError;

      const paymentIds = (paymentsData || []).map((row) => row.id);
      if (paymentIds.length > 0) {
        const { error: deletePaymentsError } = await supabase.from('payments').delete().in('id', paymentIds);
        if (deletePaymentsError) throw deletePaymentsError;
      }

      const settingsDeleteQuery = supabase.from('settings').delete();
      const { error: deleteSettingsError } = ownerId
        ? await settingsDeleteQuery.eq('owner_id', ownerId)
        : await settingsDeleteQuery.eq('id', settings.id || '');
      if (deleteSettingsError) throw deleteSettingsError;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('academySetupCompleted');
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      if (onAcademyProfileDeleted) {
        onAcademyProfileDeleted();
      }

      onClose();
    } catch (err) {
      setError(err.message || t('err_delete'));
    } finally {
      setDeleting(false);
    }
  }

  async function loadArchivedStudents() {
    setError('');
    setArchivedLoading(true);
    const { data, error } = await supabase.from('students').select('*').eq('active', false).order('name');
    setArchivedLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setArchivedStudents(data || []);
  }

  function openArchivedTab() {
    setActiveTab('archived');
    loadArchivedStudents();
  }

  async function handleRestoreStudent(student) {
    setArchiveActionId(student.id);
    const { error } = await supabase.from('students').update({ active: true }).eq('id', student.id);
    setArchiveActionId(null);
    if (error) {
      notify({ message: t('restore_failed', { msg: error.message }), danger: true });
      return;
    }
    setArchivedStudents((list) => list.filter((s) => s.id !== student.id));
  }

  async function handleDeleteArchivedStudent(student) {
    // Best-effort count for the confirm message; not fatal if it fails.
    const { count } = await supabase.from('payments').select('id', { count: 'exact', head: true }).eq('student_id', student.id);
    const ok = await confirm({
      title: t('delete_student'),
      message: t('delete_student_confirm', { name: student.name, count: count || 0 }),
      danger: true,
      confirmLabel: t('delete'),
    });
    if (!ok) return;

    setArchiveActionId(student.id);
    // Deleting the student also deletes their payments automatically (the
    // payments table's foreign key to students is set to cascade on delete).
    const { error } = await supabase.from('students').delete().eq('id', student.id);
    setArchiveActionId(null);
    if (error) {
      notify({ message: t('delete_failed', { msg: error.message }), danger: true });
      return;
    }
    setArchivedStudents((list) => list.filter((s) => s.id !== student.id));
  }

  function openPasswordModal() {
    setShowPasswordModal(true);
    setError('');
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setPasswordVerified(false);
    setPasswordStep('verify');
    setVerificationMessage('');
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setPasswordVerified(false);
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setVerificationMessage('');
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal settings-modal">
        {showPasswordModal && (
          <div className="password-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closePasswordModal(); }}>
            <div className="password-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-head-icon"><Icon name="lock" size={22} /></div>
                <div>
                  <h3>{t('change_password')}</h3>
                  <div className="sub">
                    {passwordStep === 'verify' ? t('step_verify') : t('step_new')}
                  </div>
                </div>
              </div>

              {passwordStep === 'verify' ? (
                <>
                  <div className="field">
                    <label htmlFor="old_password">{t('current_password')}</label>
                    <input
                      id="old_password"
                      type="password"
                      autoComplete="current-password"
                      maxLength={128}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder={t('current_password')}
                    />
                  </div>

                  {verificationMessage && <div className="field-success inline-success">{verificationMessage}</div>}
                </>
              ) : (
                <>
                  {verificationMessage && <div className="field-success inline-success">{verificationMessage}</div>}

                  <div className="field">
                    <label htmlFor="new_password">{t('new_password')}</label>
                    <input
                      id="new_password"
                      type="password"
                      autoComplete="new-password"
                      maxLength={128}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('new_password')}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="confirm_password">{t('confirm_new_password')}</label>
                    <input
                      id="confirm_password"
                      type="password"
                      autoComplete="new-password"
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('confirm_new_password')}
                    />
                  </div>

                  <div className="password-meter" aria-live="polite">
                    {passwordMeter.map((item) => (
                      <span key={item.key} className={item.valid ? 'meter-item valid' : 'meter-item'}>
                        {t(item.key)}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {error && <div className="field-error">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={closePasswordModal}>{t('cancel')}</button>
                {passwordStep === 'verify' ? (
                  <button type="button" className="btn-cta" onClick={handleVerifyCurrentPassword} disabled={passwordSaving}>
                    {passwordSaving ? t('verifying') : t('continue')}
                  </button>
                ) : (
                  <button type="button" className="btn-cta" onClick={handlePasswordChange} disabled={passwordSaving}>
                    {passwordSaving ? t('updating') : t('save_new_password')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <button type="button" className="modal-close" onClick={onClose} aria-label={t('close')}>
          <Icon name="close" size={18} />
        </button>

        <div className="modal-head">
          <div className="modal-head-icon"><Icon name="sliders" size={22} /></div>
          <div>
            <h2>{t('settings')}</h2>
            <div className="sub">{t('settings_sub')}</div>
          </div>
        </div>

        <div className="settings-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={activeTab === 'profile' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('profile')}
          >
            <Icon name="home" size={16} />
            {t('tab_academy')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'account'}
            className={activeTab === 'account' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setActiveTab('account')}
          >
            <Icon name="user" size={16} />
            {t('tab_account')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archived'}
            className={activeTab === 'archived' ? 'tab-btn active' : 'tab-btn'}
            onClick={openArchivedTab}
          >
            <Icon name="box" size={16} />
            {t('tab_archived')}
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className="settings-panel">
            <div className="identity-card">
              <div className="identity-logo">
                {logoPreview ? <img src={logoPreview} alt={t('logo_alt')} /> : <span>{t('logo_word')}</span>}
              </div>
              <div className="identity-meta">
                <div className="identity-name">{name || t('academy_name')}</div>
                <label className="logo-change-btn">
                  <input type="file" accept="image/*" onChange={handleLogoChange} />
                  <Icon name="camera" size={15} />
                  {logoPreview ? t('change_logo') : t('upload_logo')}
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="s_name">{t('academy_name')}</label>
              <input id="s_name" maxLength={LIMITS.academyName} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('academy_name_ph')} />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="s_owner">{t('contact_person')}</label>
                <input id="s_owner" maxLength={LIMITS.contact} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder={t('contact_person_ph')} />
              </div>
              <div className="field">
                <label htmlFor="s_phone">{t('phone')}</label>
                <input id="s_phone" dir="ltr" className="phone-input" type="tel" inputMode="tel" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phone_ph')} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="s_address">{t('address')}</label>
              <input id="s_address" maxLength={LIMITS.address} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('address_ph')} />
            </div>

            {error && <div className="field-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={onClose}>{t('cancel')}</button>
              <button type="button" className="btn-cta" onClick={handleSave} disabled={saving}>
                {saving ? t('saving') : t('save_changes')}
              </button>
            </div>
          </div>
        ) : activeTab === 'account' ? (
          <div className="settings-panel">
            <div className="settings-row">
              <div className="settings-row-icon"><Icon name="lock" size={20} /></div>
              <div className="settings-row-copy">
                <strong>{t('password')}</strong>
                <span>{t('password_help')}</span>
              </div>
              <button type="button" className="btn" onClick={openPasswordModal}>{t('change')}</button>
            </div>

            <div className="settings-row danger-row">
              <div className="settings-row-icon"><Icon name="trash" size={20} /></div>
              <div className="settings-row-copy">
                <strong>{t('delete_account')}</strong>
                <span>{t('delete_account_help')}</span>
              </div>
              <button type="button" className="btn danger" onClick={handleDeleteAcademyProfile} disabled={deleting}>
                {deleting ? t('deleting') : t('delete')}
              </button>
            </div>

            {error && <div className="field-error">{error}</div>}
          </div>
        ) : (
          <div className="settings-panel">
            <div className="sub">{t('archived_help')}</div>

            {archivedLoading ? (
              <div className="loading-state small"><div className="spinner" aria-hidden="true" /></div>
            ) : archivedStudents.length === 0 ? (
              <div className="empty-state compact">
                <div className="big">{t('no_archived_students')}</div>
              </div>
            ) : (
              <div className="archived-list">
                {archivedStudents.map((s) => (
                  <div key={s.id} className="settings-row">
                    <span className={`level-chip lv-${s.level}`}>{s.level}</span>
                    <div className="settings-row-copy">
                      <strong>{s.name}</strong>
                      <span>{s.class}</span>
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn" disabled={archiveActionId === s.id} onClick={() => handleRestoreStudent(s)}>
                        {t('restore')}
                      </button>
                      <button type="button" className="btn danger" disabled={archiveActionId === s.id} onClick={() => handleDeleteArchivedStudent(s)}>
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="field-error">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
