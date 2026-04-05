import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useUserSettingsStore } from '../store/userSettingsStore';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, X, LogOut, MapPin, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { logout } = useAuthStore();
  const {
    name,
    pronouns,
    autoLocation,
    location,
    timezone,
    country,
    isLoading,
    fetchSettings,
    updateSettings,
  } = useUserSettingsStore();
  const navigate = useNavigate();

  // Local state for inputs to avoid spamming the API on every keystroke
  const [localName, setLocalName] = useState(name);
  const [localPronouns, setLocalPronouns] = useState(pronouns);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync local state when external data comes in
  useEffect(() => {
    setLocalName(name);
    setLocalPronouns(pronouns);
  }, [name, pronouns]);

  const handleBlurName = () => {
    if (localName !== name) updateSettings({ name: localName });
  };

  const handleBlurPronouns = () => {
    if (localPronouns !== pronouns) updateSettings({ pronouns: localPronouns });
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="modal-enter relative w-full max-w-sm rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2
            className="text-[14px] font-bold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-hint)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-hint)')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span
                className="text-[14px] font-medium"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                Appearance
              </span>
              <span
                className="text-[12px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Switch between light and dark mode
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
              <span className="text-[12px] capitalize">{theme}</span>
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border)' }} />

          {/* User Context */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <span
                className="text-[14px] font-medium"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                Personal Context
              </span>
              <span
                className="text-[12px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Details Byte can use to personalize tasks
              </span>
            </div>

            {/* Name Input */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-hint)' }}
              >
                Name
              </label>
              <input
                type="text"
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={handleBlurName}
                placeholder="What should Byte call you?"
                className="px-3 py-2 rounded-lg outline-none text-[13px] transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlurCapture={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  handleBlurName();
                }}
              />
            </div>

            {/* Pronouns Input */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[11px] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-hint)' }}
              >
                Pronouns
              </label>
              <input
                type="text"
                value={localPronouns}
                onChange={e => setLocalPronouns(e.target.value)}
                onBlur={handleBlurPronouns}
                placeholder="e.g. they/them, she/her"
                className="px-3 py-2 rounded-lg outline-none text-[13px] transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlurCapture={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  handleBlurPronouns();
                }}
              />
            </div>

            {/* Auto Location Toggle */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                  >
                    Auto Location
                  </span>
                  <span
                    className="text-[11px] max-w-[200px] leading-tight mt-0.5"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    Allow Byte to use your city/region for local tasks
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ autoLocation: !autoLocation })}
                  disabled={isLoading}
                  className="relative w-10 h-5 rounded-full transition-colors flex items-center shrink-0 disabled:opacity-50"
                  style={{
                    background: autoLocation ? 'var(--accent)' : 'var(--bg-surface)',
                    border: `1px solid ${autoLocation ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-white transition-transform absolute"
                    style={{ transform: `translateX(${autoLocation ? '22px' : '4px'})` }}
                  />
                </button>
              </div>

              {/* Geo info pill — visible when autoLocation is on */}
              {autoLocation && (
                <div
                  className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                >
                  {isLoading ? (
                    <span
                      className="text-[11px] animate-pulse"
                      style={{ color: 'var(--text-hint)', fontFamily: 'var(--font-mono)' }}
                    >
                      Detecting location…
                    </span>
                  ) : location ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ color: 'var(--accent)', flexShrink: 0 }}
                        >
                          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                        >
                          {location}
                        </span>
                        {country && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--bg-elevated)',
                              color: 'var(--text-hint)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {country}
                          </span>
                        )}
                      </div>
                      {timezone && (
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          ⏱ {timezone}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-hint)', fontFamily: 'var(--font-body)' }}
                    >
                      Location will appear after your first message
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border)' }} />

          {/* Logout Action */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span
                className="text-[14px] font-medium text-red-500"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Danger Zone
              </span>
              <span
                className="text-[12px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Sign out of your account
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 text-red-500 border-red-500/30 hover:border-red-500 hover:bg-red-500/10"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <LogOut size={14} />
              <span className="text-[12px]">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
