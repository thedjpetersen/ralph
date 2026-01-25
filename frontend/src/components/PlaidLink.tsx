import { useCallback, useEffect, useState } from 'react';
import { useFinancialStore } from '../stores/financial';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import './PlaidLink.css';

interface PlaidLinkProps {
  onSuccess?: () => void;
  onExit?: () => void;
  buttonText?: string;
  buttonClassName?: string;
}

interface PlaidLinkHandler {
  open: () => void;
  exit: (options?: { force?: boolean }) => void;
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: PlaidCreateConfig) => PlaidLinkHandler;
    };
  }
}

interface PlaidCreateConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidMetadata) => void;
  onExit: (error: PlaidError | null, metadata: PlaidMetadata) => void;
  onLoad?: () => void;
  onEvent?: (eventName: string, metadata: PlaidMetadata) => void;
}

interface PlaidMetadata {
  institution?: {
    institution_id: string;
    name: string;
  };
  link_session_id?: string;
  status?: string;
}

interface PlaidError {
  error_code: string;
  error_message: string;
  error_type: string;
  display_message: string | null;
}

export function PlaidLink({
  onSuccess,
  onExit,
  buttonText = 'Connect Bank Account',
  buttonClassName,
}: PlaidLinkProps) {
  const { currentAccount } = useAccountStore();
  const {
    linkToken,
    isLoading,
    error,
    createLinkToken,
    connectConnection,
    clearLinkToken,
    clearError,
  } = useFinancialStore();

  const [plaidHandler, setPlaidHandler] = useState<PlaidLinkHandler | null>(null);
  const [isPlaidLoaded, setIsPlaidLoaded] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load Plaid SDK
  useEffect(() => {
    if (window.Plaid) {
      setIsPlaidLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => setIsPlaidLoaded(true);
    script.onerror = () => {
      toast.error('Failed to load Plaid. Please try again.');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize Plaid Link when token is available
  useEffect(() => {
    if (!linkToken || !isPlaidLoaded || !window.Plaid || !currentAccount) {
      return;
    }

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken, metadata) => {
        setIsConnecting(true);
        try {
          await connectConnection(currentAccount.id, {
            provider: 'plaid',
            public_token: publicToken,
            institution_id: metadata.institution?.institution_id,
          });
          toast.success(
            `Successfully connected to ${metadata.institution?.name || 'your bank'}`
          );
          clearLinkToken();
          onSuccess?.();
        } catch {
          toast.error('Failed to connect your bank account. Please try again.');
        } finally {
          setIsConnecting(false);
        }
      },
      onExit: (exitError, metadata) => {
        clearLinkToken();
        if (exitError && metadata.status !== 'requires_credentials') {
          toast.error(exitError.display_message || exitError.error_message);
        }
        onExit?.();
      },
      onLoad: () => {
        // Plaid Link is ready
      },
    });

    setPlaidHandler(handler);

    return () => {
      handler.exit({ force: true });
    };
  }, [
    linkToken,
    isPlaidLoaded,
    currentAccount,
    connectConnection,
    clearLinkToken,
    onSuccess,
    onExit,
  ]);

  // Open Plaid Link when handler is ready and token exists
  useEffect(() => {
    if (plaidHandler && linkToken) {
      plaidHandler.open();
    }
  }, [plaidHandler, linkToken]);

  const handleClick = useCallback(async () => {
    if (!currentAccount) {
      toast.error('Please select an account first');
      return;
    }

    clearError();

    try {
      await createLinkToken(currentAccount.id);
    } catch {
      toast.error('Failed to initialize bank connection. Please try again.');
    }
  }, [currentAccount, createLinkToken, clearError]);

  const isButtonDisabled = !isPlaidLoaded || isLoading || isConnecting;

  return (
    <div className="plaid-link-container">
      <button
        onClick={handleClick}
        disabled={isButtonDisabled}
        className={buttonClassName || 'plaid-link-button'}
      >
        {isLoading || isConnecting ? (
          <span className="plaid-link-loading">
            <span className="loading-spinner" />
            {isConnecting ? 'Connecting...' : 'Loading...'}
          </span>
        ) : (
          buttonText
        )}
      </button>
      {error && <p className="plaid-link-error">{error}</p>}
    </div>
  );
}
