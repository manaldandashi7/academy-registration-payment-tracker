import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function SettingsModal({ settings, onClose }) {
  const [name, setName] = useState(settings.academy_name || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(settings.logo_url || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      let logoUrl = settings.logo_url || null;

      if (file) {
        const ext = file.name.split('.').pop();
        const path = `academy-logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, {
          upsert: true,
          cacheControl: '3600',
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('logos').getPublicUrl(path);
        logoUrl = data.publicUrl;
      }

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ id: 'general', academy_name: name.trim() || 'Your Academy', logo_url: logoUrl });
      if (upsertError) throw upsertError;

      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong saving settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>Academy settings</h2>
        <div className="sub">This name and logo appear across the app for everyone.</div>
        <div className="field">
          <label htmlFor="s_name">Academy name</label>
          <input id="s_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cedar Grove Academy" />
        </div>
        <div className="field">
          <label>Logo</label>
          <div className="logo-upload-row">
            <div className="logo-preview">
              {preview ? <img src={preview} alt="Logo preview" /> : (name || 'A').trim().charAt(0).toUpperCase()}
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>
        {error && <div className="field-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
