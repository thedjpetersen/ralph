import { useCallback, useState } from 'react';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import { emailOAuthApi, type EmailProvider } from '../api/client';
import './EmailConnect.css';

interface EmailConnectProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: string;
  buttonClassName?: string;
}

export function EmailConnect({
  onSuccess,
  onError,
  buttonText = 'Connect Email',
  buttonClassName,
}: EmailConnectProps) {
  const { currentAccount } = useAccountStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showProviderSelect, setShowProviderSelect] = useState(false);

  const handleConnect = useCallback(async (provider: EmailProvider) => {
    if (!currentAccount?.id) {
      toast.error('Please select an account first');
      return;
    }

    setIsConnecting(true);
    setShowProviderSelect(false);

    try {
      // Get the current URL origin for the redirect URI
      const redirectUri = `${window.location.origin}/integrations/email/callback`;

      // Initiate OAuth flow
      const response = await emailOAuthApi.initiate(currentAccount.id, {
        redirect_uri: redirectUri,
        provider,
        scopes: provider === 'gmail'
          ? ['https://www.googleapis.com/auth/gmail.readonly']
          : ['https://graph.microsoft.com/Mail.Read'],
      });

      // Store state in sessionStorage for verification after redirect
      sessionStorage.setItem('email_oauth_state', response.state);
      sessionStorage.setItem('email_oauth_account_id', currentAccount.id);
      sessionStorage.setItem('email_oauth_provider', provider);

      // Redirect to OAuth
      window.location.href = response.authorization_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect email';
      toast.error(errorMessage);
      onError?.(errorMessage);
      setIsConnecting(false);
    }
  }, [currentAccount?.id, onError]);

  // Handle OAuth callback (when returning from provider)
  const handleCallback = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      const errorMessage = urlParams.get('error_description') || 'Authorization was denied';
      toast.error(errorMessage);
      onError?.(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!code || !state) {
      return;
    }

    const storedState = sessionStorage.getItem('email_oauth_state');
    const accountId = sessionStorage.getItem('email_oauth_account_id');

    if (state !== storedState) {
      toast.error('OAuth state mismatch. Please try again.');
      onError?.('OAuth state mismatch');
      sessionStorage.removeItem('email_oauth_state');
      sessionStorage.removeItem('email_oauth_account_id');
      sessionStorage.removeItem('email_oauth_provider');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!accountId) {
      toast.error('Session expired. Please try again.');
      onError?.('Session expired');
      sessionStorage.removeItem('email_oauth_state');
      sessionStorage.removeItem('email_oauth_provider');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    setIsConnecting(true);

    try {
      const redirectUri = `${window.location.origin}/integrations/email/callback`;

      await emailOAuthApi.callback(accountId, {
        code,
        state,
        redirect_uri: redirectUri,
      });

      sessionStorage.removeItem('email_oauth_state');
      sessionStorage.removeItem('email_oauth_account_id');
      sessionStorage.removeItem('email_oauth_provider');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete email authorization';
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [onSuccess, onError]);

  // Check for OAuth callback on mount
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('error')) {
      handleCallback();
    }
  });

  return (
    <div className="email-connect-container">
      <button
        onClick={() => setShowProviderSelect(true)}
        disabled={isConnecting || !currentAccount}
        className={buttonClassName || 'email-connect-button'}
      >
        {isConnecting ? (
          <span className="email-connect-loading">
            <span className="loading-spinner" />
            Connecting...
          </span>
        ) : (
          <>
            <span className="email-icon">@</span>
            {buttonText}
          </>
        )}
      </button>

      {showProviderSelect && (
        <div className="provider-select-overlay" onClick={() => setShowProviderSelect(false)}>
          <div className="provider-select-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Choose Email Provider</h3>
            <p className="provider-select-description">
              Select your email provider to connect your account.
            </p>
            <div className="provider-options">
              <button
                onClick={() => handleConnect('gmail')}
                className="provider-option"
                disabled={isConnecting}
              >
                <span className="provider-icon gmail-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path
                      fill="#EA4335"
                      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                    />
                  </svg>
                </span>
                <span className="provider-name">Gmail</span>
              </button>
              <button
                onClick={() => handleConnect('outlook')}
                className="provider-option"
                disabled={isConnecting}
              >
                <span className="provider-icon outlook-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24">
                    <path
                      fill="#0078D4"
                      d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 0 1-.576.238h-8.61v-5.478L18 12l-3.424 1.2V7.387l3.424 1.2 3.424-1.2-3.424-1.2L24 7.387zM24 5.92V4.73l-3.424 1.2-3.424-1.2L24 5.92zM13.576 19.922a.806.806 0 0 1-.576.238H.576a.727.727 0 0 1-.576-.238A.806.806 0 0 1 0 19.346V4.73c0-.23.08-.424.238-.576A.727.727 0 0 1 .576 3.916h12.424c.23 0 .424.08.576.238.158.152.238.346.238.576v14.616c0 .23-.08.424-.238.576zM6.787 8.23c-1.45 0-2.626.435-3.526 1.306-.9.871-1.35 2.01-1.35 3.415s.45 2.544 1.35 3.415c.9.871 2.076 1.307 3.526 1.307 1.45 0 2.626-.436 3.527-1.307.9-.871 1.35-2.01 1.35-3.415s-.45-2.544-1.35-3.415c-.9-.871-2.077-1.306-3.527-1.306zm0 7.148c-.822 0-1.48-.273-1.976-.82-.495-.546-.743-1.287-.743-2.223s.248-1.677.743-2.223c.495-.547 1.154-.82 1.976-.82.822 0 1.481.273 1.976.82.496.546.744 1.287.744 2.223s-.248 1.677-.744 2.223c-.495.547-1.154.82-1.976.82z"
                    />
                  </svg>
                </span>
                <span className="provider-name">Outlook</span>
              </button>
            </div>
            <button
              onClick={() => setShowProviderSelect(false)}
              className="provider-cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
