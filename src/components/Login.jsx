import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '../i18n.jsx';
import { email as validateEmail, image as validateImage, passwordLength, cleanText, errText, LIMITS } from '../lib/validate';

function Mascots() {
  return (
    <>
      <svg className="mascot mascot-left" viewBox="0 0 140 160" aria-hidden="true">
        <ellipse cx="70" cy="150" rx="46" ry="8" fill="#17392F" opacity="0.08" />
        <path d="M70 10c33 0 55 26 55 62 0 40-25 70-55 70S15 112 15 72C15 36 37 10 70 10Z" fill="#4F9A82" />
        <circle className="mascot-eye" cx="52" cy="70" r="10" fill="#fff" />
        <circle className="mascot-eye" cx="88" cy="70" r="10" fill="#fff" />
        <circle cx="52" cy="72" r="5" fill="#17392F" />
        <circle cx="88" cy="72" r="5" fill="#17392F" />
        <path d="M55 100c8 8 22 8 30 0" stroke="#17392F" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>

      <svg className="mascot mascot-right" viewBox="0 0 140 160" aria-hidden="true">
        <ellipse cx="70" cy="150" rx="42" ry="7" fill="#17392F" opacity="0.08" />
        <path d="M70 14c30 0 50 22 50 56 0 38-22 66-50 66S20 108 20 70C20 36 40 14 70 14Z" fill="#F4C95D" />
        <circle className="mascot-eye" cx="55" cy="64" r="8" fill="#fff" />
        <circle className="mascot-eye" cx="85" cy="64" r="8" fill="#fff" />
        <circle cx="55" cy="66" r="4" fill="#17392F" />
        <circle cx="85" cy="66" r="4" fill="#17392F" />
        <circle cx="70" cy="90" r="6" fill="#E8794B" />
      </svg>
    </>
  );
}

export default function Login({ settings, mode = 'login', onEnteredAcademy, onAcademyConfigured }) {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [academyDraftName, setAcademyDraftName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(settings?.logo_url || null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { lang: language, setLang: setLanguage, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState(mode === 'welcome' ? 'welcome' : (mode === 'setup' ? 'setup' : 'login'));

  const isValidAcademyName = (value) => {
    if (!value) return false;
    const trimmed = String(value).trim();
    return trimmed.length > 0 && trimmed !== 'Your Academy' && trimmed !== 'My Academy';
  };

  const isSetupMode = authMode === 'setup';
  const isWelcome = authMode === 'welcome' || showWelcome;
  const isArabic = language === 'ar';
  const textDirection = isArabic ? 'rtl' : 'ltr';
  const academyName = settings?.academy_name || 'أكاديمية المهرة';
  const logoUrl = logoPreview || settings?.logo_url || null;
  const loginTitle = isSetupMode ? (isArabic ? 'إعداد أكاديميتك' : 'Set up your academy') : (isWelcome ? academyName : (isArabic ? 'أدخل أكاديميتك' : 'Enter your Academy'));

  const isResetMode = authMode === 'reset';
  const isSignupMode = authMode === 'signup';
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getSignupValidationErrors() {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    if (!trimmedEmail) {
      nextErrors.email = isArabic ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.';
    } else if (!emailRegex.test(normalizedEmail)) {
      nextErrors.email = isArabic ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.';
    }

    if (isSignupMode && confirmEmail.trim() && normalizedEmail !== confirmEmail.trim().toLowerCase()) {
      nextErrors.confirmEmail = isArabic ? 'البريد الإلكتروني غير متطابق.' : 'Email addresses do not match.';
    }

    if (isSignupMode && password && !strongPasswordRegex.test(password)) {
      nextErrors.password = isArabic
        ? 'يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حرف صغير، حرف كبير، رقم، ورمز خاص.'
        : 'Password must be at least 8 characters and include one lowercase letter, one uppercase letter, one number, and one special character.';
    }

    if (isSignupMode && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = isArabic ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.';
    }

    return nextErrors;
  }

  function setMode(nextMode) {
    setAuthMode(nextMode);
    setError('');
    setStatusMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      if (isSignupMode) {
        const trimmedEmail = email.trim();
        const normalizedEmail = trimmedEmail.toLowerCase();
        const validationErrors = getSignupValidationErrors();

        if (validationErrors.email || validationErrors.confirmEmail || validationErrors.password || validationErrors.confirmPassword) {
          setError(
            validationErrors.email ||
            validationErrors.confirmEmail ||
            validationErrors.password ||
            validationErrors.confirmPassword
          );
          return;
        }

        const emailCheck = validateEmail(trimmedEmail);
        if (emailCheck.error) {
          setError(errText(t, emailCheck.error));
          return;
        }
        const lengthCheck = passwordLength(password);
        if (lengthCheck.error) {
          setError(errText(t, lengthCheck.error));
          return;
        }

        // email_input matches the parameter name in the is_email_available() function
        // (see supabase/schema.sql). This is just an early, friendlier check - signUp()
        // below still rejects a duplicate email on its own either way.
        const { data: emailAvailability, error: emailCheckError } = await supabase
          .rpc('is_email_available', { email_input: normalizedEmail });

        // If the function isn't deployed yet (PGRST202) or isn't reachable, don't block
        // signing up over it - just skip the early check and let signUp() below catch a
        // duplicate email itself. Only a real "false" answer stops signup here.
        if (!emailCheckError && emailAvailability === false) {
          setError(isArabic ? 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني مختلف.' : 'This email is already in use. Please sign in or use a different email.');
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (signUpError) {
          const msg = signUpError.message || '';
          const lower = msg.toLowerCase();

          if (lower.includes('rate limit') || lower.includes('too many requests')) {
            setError(isArabic ? 'تم تجاوز الحد المسموح لبريدك الإلكتروني. يرجى المحاولة بعد قليل.' : 'Email rate limit exceeded. Please try again in a moment.');
            return;
          }

          if (lower.includes('user already registered') || lower.includes('already registered') || lower.includes('email already')) {
            setError(isArabic ? 'هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني مختلف.' : 'This email is already in use. Please sign in or use a different email.');
            return;
          }

          setError(msg || (isArabic ? 'تعذر إنشاء الحساب.' : 'Could not create the account.'));
          return;
        }

        if (data?.user && !data.session) {
          setStatusMessage(
            isArabic
              ? 'تم إنشاء الحساب بنجاح. تم إرسال رابط تأكيد إلى بريدك الإلكتروني.'
              : 'Account created successfully. Check your email for a confirmation link.'
          );
          setEmail('');
          setConfirmEmail('');
          setPassword('');
          setConfirmPassword('');
          setAuthMode('login');
          return;
        }

        setStatusMessage(
          isArabic
            ? 'تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.'
            : 'Account created successfully. You can now sign in.'
        );
        setAuthMode('login');
        return;
      }

      if (isResetMode) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setStatusMessage(
          isArabic
            ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
            : 'A password reset link has been sent to your email.'
        );
        setPassword('');
        setAuthMode('login');
        return;
      }

      if (isSetupMode) {
        const finalAcademyName = cleanText(academyDraftName).slice(0, LIMITS.academyName) || 'Your Academy';
        let uploadUrl = settings?.logo_url || null;

        // Needed both to scope the logo's storage folder and to tie the
        // settings row to this academy's account.
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const ownerId = userData?.user?.id;
        if (userError || !ownerId) {
          setError(userError?.message || (isArabic ? 'يجب تسجيل الدخول أولاً.' : 'You need to be signed in first.'));
          return;
        }

        if (logoFile) {
          // Extension and content type come from the verified file contents, not the file name.
          const checked = await validateImage(logoFile);
          if (checked.error) {
            setError(errText(t, checked.error));
            return;
          }
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

        const { error: saveError } = await supabase
          .from('settings')
          .upsert({ owner_id: ownerId, academy_name: finalAcademyName, logo_url: uploadUrl }, { onConflict: 'owner_id' });

        if (saveError) {
          setError(saveError.message);
          return;
        }

        const nextSettings = {
          owner_id: ownerId,
          academy_name: finalAcademyName,
          logo_url: uploadUrl,
        };

        if (typeof window !== 'undefined') {
          // Scoped to this account's id, not just "true" - see App.jsx for why.
          localStorage.setItem('academySetupCompleted', ownerId);
        }

        if (onAcademyConfigured) {
          onAcademyConfigured(nextSettings);
        }

        setAuthMode('welcome');
        setShowWelcome(true);
        setStatusMessage('');
        if (uploadUrl) {
          setLogoPreview(uploadUrl);
        }
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(loginError.message);
        return;
      }

      setShowWelcome(true);
    } finally {
      setLoading(false);
    }
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
    // Show a cleaned-up name so odd characters in file names never reach the page.
    const safeName = cleanText(file.name).slice(0, 60);
    setStatusMessage(
      isArabic
        ? `تم اختيار الملف: ${safeName}`
        : `Selected file: ${safeName}`
    );

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  }

  // Google sign-in is switched off in this project (Supabase Dashboard -> Authentication
  // -> Providers -> Google is disabled), so the button and its handler were removed
  // rather than left in place showing an error. Re-add both if that provider is enabled.

  const submitButtonLabel = isSignupMode
    ? (isArabic ? 'إنشاء الحساب' : 'Create account')
    : isResetMode
      ? (isArabic ? 'إرسال رابط الاستعادة' : 'Send reset link')
      : (isArabic ? 'دخول' : 'Login');

  if (isSetupMode) {
    return (
      <div className="login-screen light-shell">
        <div className="language-switcher" aria-label="Language selector">
          <button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}>AR</button>
          <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>

        <div className="login-card academy-card setup-card" dir={textDirection}>
          <div className="login-card-glow" aria-hidden="true" />
          <h1>{isArabic ? 'إعداد الأكاديمية' : 'Set up your academy'}</h1>
          <div className="sub">
            {isArabic ? 'أضف اسم أكاديميتك وشعارها ' : 'Add your academy name and logo so the welcome screen feels like yours.'}
          </div>

          <form onSubmit={handleSubmit} dir={textDirection}>
            <div className="field academy-name-field">
              <label htmlFor="academy-setup-name">{isArabic ? 'اسم الأكاديمية' : 'Academy name'}</label>
              <input
                id="academy-setup-name"
                type="text"
                required
                maxLength={LIMITS.academyName}
                value={academyDraftName}
                onChange={(e) => setAcademyDraftName(e.target.value)}
                placeholder={isArabic ? 'اسم أكاديميتك' : 'Your academy name'}
              />
            </div>

            <div className="field logo-field">
              <label>{isArabic ? 'شعار الأكاديمية' : 'Academy logo'}</label>
              <label className="upload-btn upload-only-btn">
                <input type="file" accept="image/*" onChange={handleLogoChange} />
                <span className="upload-icon">+</span>
                <span>{isArabic ? 'أضف شعارك' : 'Add your logo'}</span>
              </label>
            </div>

            {error && <div className="field-error">{error}</div>}
            {statusMessage && <div className="field-success">{statusMessage}</div>}
            <button type="submit" className="btn primary academy-btn" disabled={loading}>
              {loading ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ وإدخال المؤسسة' : 'Save and continue')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isWelcome) {
    return (
      <div className="login-screen light-shell">
        <div className="language-switcher" aria-label="Language selector">
          <button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}>AR</button>
          <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>

        <Mascots />

        <div className="login-panel welcome-panel">
          <div className="login-emblem welcome-emblem" aria-label="Academy logo">
            {logoUrl ? <img src={logoUrl} alt={academyName} /> : <span></span>}
          </div>

          <div className="welcome-title-wrap">
            <div className="academy-title">{academyName}</div>
            <div className="academy-subtitle">{t('welcome_tagline')}</div>
          </div>

          <div className="welcome-verse">
            ﴿قَالُوا سُبْحَانَكَ لَا عِلْمَ لَنَا إِلَّا مَا عَلَّمْتَنَا إِنَّكَ أَنْتَ الْعَلِيمُ الْحَكِيمُ﴾
          </div>

          <div className="welcome-copy">
            <h2>{t('welcome_title')}</h2>
            <p>{t('welcome_hint')}</p>
          </div>

          <div className="welcome-actions">
            <button
              type="button"
              className="start-btn"
              onClick={() => {
                if (onEnteredAcademy) onEnteredAcademy();
              }}
            >
              {t('start')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen light-shell">
      <div className="language-switcher" aria-label="Language selector">
        <button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}>AR</button>
        <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
      </div>

      <Mascots />

      <div className="login-card academy-card" dir={textDirection}>
        <div className="login-card-glow" aria-hidden="true" />

        <h1>{loginTitle}</h1>
        <div className="sub">
          {isResetMode
            ? (isArabic ? 'أدخل بريدك الإلكتروني لتلقي رابط إعادة تعيين كلمة المرور.' : 'Enter your email to receive a reset link.')
            : isSignupMode
              ? (isArabic ? 'أنشئ حساب الموظف للوصول إلى لوحة الأكاديمية.' : 'Create your staff account to access the academy dashboard.')
              : (isArabic ? 'سجل الدخول باستخدام حساب الموظف للمتابعة.' : 'Sign in to continue with your academy portal.')}
        </div>


        <form onSubmit={handleSubmit} dir={textDirection}>
          <div className="field">
            <label htmlFor="email">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={LIMITS.email}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isArabic ? 'you@academy.com' : 'you@academy.com'}
              aria-invalid={isSignupMode && email.length > 0 && !!getSignupValidationErrors().email}
            />
            {isSignupMode && email.length > 0 && getSignupValidationErrors().email && (
              <div className="field-error">{getSignupValidationErrors().email}</div>
            )}
          </div>

          {isSignupMode && (
            <div className="field">
              <label htmlFor="confirm-email">{isArabic ? 'تأكيد البريد الإلكتروني' : 'Confirm email'}</label>
              <input
                id="confirm-email"
                type="email"
                autoComplete="off"
                maxLength={LIMITS.email}
                required
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={isArabic ? 'retype@example.com' : 'retype@example.com'}
                aria-invalid={isSignupMode && confirmEmail.length > 0 && !!getSignupValidationErrors().confirmEmail}
              />
              {confirmEmail.length > 0 && getSignupValidationErrors().confirmEmail && (
                <div className="field-error">{getSignupValidationErrors().confirmEmail}</div>
              )}
            </div>
          )}

          {!isResetMode && (
            <>
              <div className="field">
                <label htmlFor="password">{isArabic ? 'كلمة المرور' : 'Password'}</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    maxLength={128}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    aria-invalid={isSignupMode && password.length > 0 && !!getSignupValidationErrors().password}
                  />
                  <button
                    type="button"
                    className="eye-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>

                {isSignupMode && (
                  <div className="password-help">
                    {isArabic ? '8 أحرف على الأقل، حرف صغير، حرف كبير، رقم، ورمز خاص.' : 'At least 8 characters, including lowercase, uppercase, number, and symbol.'}
                  </div>
                )}

                {isSignupMode && password.length > 0 && getSignupValidationErrors().password && (
                  <div className="field-error">{getSignupValidationErrors().password}</div>
                )}

                {!isSignupMode && (
                  <div className="login-meta-row">
                    <label className="remember-me">
                      <input type="checkbox" defaultChecked />
                      <span className="checkmark" aria-hidden="true">✓</span>
                      <span className="remember-text">{isArabic ? 'تذكرني' : 'Remember me'}</span>
                    </label>
                    <button type="button" className="forgot-link" onClick={() => setMode('reset')}>
                      {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  </div>
                )}
              </div>

              {isSignupMode && (
                <div className="field">
                  <label htmlFor="confirm-password">{isArabic ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
                  <div className="password-wrap">
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                    maxLength={128}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      aria-invalid={isSignupMode && confirmPassword.length > 0 && !!getSignupValidationErrors().confirmPassword}
                    />
                  </div>
                  {confirmPassword.length > 0 && getSignupValidationErrors().confirmPassword && (
                    <div className="field-error">{getSignupValidationErrors().confirmPassword}</div>
                  )}
                </div>
              )}
            </>
          )}

          {error && <div className="field-error">{error}</div>}
          {statusMessage && <div className="field-success">{statusMessage}</div>}

          <button type="submit" className="btn primary academy-btn" disabled={loading}>
            {loading ? (isArabic ? 'جاري المعالجة…' : 'Processing…') : submitButtonLabel}
          </button>
        </form>

        <div className="auth-switches">
          {!isResetMode && (
            <div className="auth-switch-row">
              <span>{isArabic ? 'ليس لديك حساب؟' : 'Need an account?'}</span>
              <button type="button" className="inline-link" onClick={() => setMode('signup')}>
                {isArabic ? 'إنشاء حساب' : 'Create account'}
              </button>
            </div>
          )}

          {authMode !== 'login' && (
            <div className="auth-switch-row">
              <span>{isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}</span>
              <button type="button" className="inline-link" onClick={() => setMode('login')}>
                {isArabic ? 'تسجيل الدخول' : 'Sign in'}
              </button>
            </div>
          )}

          {authMode === 'reset' && (
            <div className="auth-switch-row">
              <span>{isArabic ? 'تحتاج مساعدة؟' : 'Need help?'}</span>
              <button type="button" className="inline-link" onClick={() => setMode('login')}>
                {isArabic ? 'العودة إلى تسجيل الدخول' : 'Back to login'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}