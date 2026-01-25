import { useCallback, useState } from 'react';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import { googleDriveOAuthApi } from '../api/client';
import './GoogleDriveConnect.css';

interface GoogleDriveConnectProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonText?: string;
  buttonClassName?: string;
}

export function GoogleDriveConnect({
  onSuccess,
  onError,
  buttonText = 'Connect Google Drive',
  buttonClassName,
}: GoogleDriveConnectProps) {
  const { currentAccount } = useAccountStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!currentAccount?.id) {
      toast.error('Please select an account first');
      return;
    }

    setIsConnecting(true);

    try {
      // Get the current URL origin for the redirect URI
      const redirectUri = `${window.location.origin}/integrations/google-drive/callback`;

      // Initiate OAuth flow
      const response = await googleDriveOAuthApi.initiate(currentAccount.id, {
        redirect_uri: redirectUri,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      // Store state in sessionStorage for verification after redirect
      sessionStorage.setItem('google_drive_oauth_state', response.state);
      sessionStorage.setItem('google_drive_oauth_account_id', currentAccount.id);

      // Redirect to Google OAuth
      window.location.href = response.authorization_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Google Drive';
      toast.error(errorMessage);
      onError?.(errorMessage);
      setIsConnecting(false);
    }
  }, [currentAccount?.id, onError]);

  // Handle OAuth callback (when returning from Google)
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

    const storedState = sessionStorage.getItem('google_drive_oauth_state');
    const accountId = sessionStorage.getItem('google_drive_oauth_account_id');

    if (state !== storedState) {
      toast.error('OAuth state mismatch. Please try again.');
      onError?.('OAuth state mismatch');
      sessionStorage.removeItem('google_drive_oauth_state');
      sessionStorage.removeItem('google_drive_oauth_account_id');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!accountId) {
      toast.error('Session expired. Please try again.');
      onError?.('Session expired');
      sessionStorage.removeItem('google_drive_oauth_state');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    setIsConnecting(true);

    try {
      const redirectUri = `${window.location.origin}/integrations/google-drive/callback`;

      await googleDriveOAuthApi.callback(accountId, {
        code,
        state,
        redirect_uri: redirectUri,
      });

      sessionStorage.removeItem('google_drive_oauth_state');
      sessionStorage.removeItem('google_drive_oauth_account_id');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete Google Drive authorization';
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
    <button
      onClick={handleConnect}
      disabled={isConnecting || !currentAccount}
      className={buttonClassName || 'google-drive-connect-button'}
    >
      {isConnecting ? (
        <span className="google-drive-connect-loading">
          <span className="loading-spinner" />
          Connecting...
        </span>
      ) : (
        <>
          <span className="google-drive-icon">
            <svg viewBox="0 0 87.3 78" width="18" height="16">
              <path
                d="M6.6 66.85L0 53.4l29.6-51.3 6.6 13.3z"
                fill="#0066da"
              />
              <path
                d="M27.5 78l-20.9-11.2 20.3-35.2L47.8 67z"
                fill="#00ac47"
              />
              <path
                d="M57.8 78H16.6l20.9-36.3h41.2z"
                fill="#ea4335"
              />
              <path
                d="M86.6 53.4L57.8 78l-20.3-35.2 28.8-16.1z"
                fill="#00832d"
              />
              <path
                d="M57.8 78l28.8-24.6-6.6-13.3-22.2 38z"
                fill="#2684fc"
              />
              <path
                d="M87.3 53.4L57.8 78 37.5 42.8l6.6-13.3z"
                fill="#ffba00"
              />
            </svg>
          </span>
          {buttonText}
        </>
      )}
    </button>
  );
}
