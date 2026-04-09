/**
 * Global type declarations for third-party integrations.
 * Google Identity Services SDK types for OAuth Sign-In button rendering.
 */
export {};

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                    }) => void;
                    renderButton: (
                        el: HTMLElement,
                        config: {
                            theme?: string;
                            size?: string;
                            width?: string;
                            text?: string;
                            shape?: string;
                        }
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}
