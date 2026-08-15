import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useUserSettingsStore } from '../store/userSettingsStore';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';

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
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="modal-enter corner-ticks max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span
                className="heading-mono text-[14px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Appearance
              </span>
              <span
                className="text-[13px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Switch between light and dark mode
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all duration-150"
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
              <span className="text-[13px] capitalize">{theme}</span>
            </button>
          </div>

          <hr style={{ borderColor: 'var(--border)' }} />

          {/* User Context */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <span
                className="heading-mono text-[14px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Personal Context
              </span>
              <span
                className="text-[13px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Details Byte can use to personalize tasks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  className="w-full px-3 py-2 rounded-sm outline-none text-[14px] transition-colors"
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
                  className="w-full px-3 py-2 rounded-sm outline-none text-[14px] transition-colors"
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
            </div>

            {/* Auto Location Toggle */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span
                    className="text-[14px] font-medium"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
                  >
                    Auto Location
                  </span>
                  <span
                    className="text-[12px] max-w-[320px] leading-tight mt-0.5"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    Allow Byte to use your city/region for local tasks
                  </span>
                </div>
                <Switch
                  checked={autoLocation}
                  disabled={isLoading}
                  onCheckedChange={checked => updateSettings({ autoLocation: checked })}
                  className="shrink-0"
                />
              </div>

              {/* Geo info pill — visible when autoLocation is on */}
              {autoLocation && (
                <div
                  className="rounded-md px-3 py-2.5 flex flex-col gap-1"
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
                          className="text-[13px] font-medium"
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
                          className="text-[12px]"
                          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                          ⏱ {timezone}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className="text-[12px]"
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
                className="heading-mono text-[14px] font-bold"
                style={{ color: 'var(--destructive)' }}
              >
                Danger Zone
              </span>
              <span
                className="text-[13px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
              >
                Sign out of your account
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm border transition-all duration-150"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--destructive)',
                borderColor: 'color-mix(in srgb, var(--destructive) 30%, transparent)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--destructive)';
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--destructive) 10%, transparent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor =
                  'color-mix(in srgb, var(--destructive) 30%, transparent)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={14} />
              <span className="text-[13px]">Log out</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
