
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/auth-context';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            console.error('[OAuth Callback] No token found in URL');
            router.push('/login?error=no_token');
            return;
        }

        console.log('[OAuth Callback] Token received, processing authentication...');

        // Helper to perform login and redirect with iOS-safe storage
        const performLogin = async (userToken: string, userData: any) => {
            console.log('[OAuth Callback] Performing login with user:', userData);

            // Call login with skipRedirect=true to prevent automatic navigation
            login(userToken, userData, true);

            // iOS Safari fix: Wait for localStorage to complete before redirecting
            // Use setTimeout to ensure storage operations are flushed
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify storage completed (especially important on iOS)
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (!storedToken || !storedUser) {
                console.error('[OAuth Callback] Storage verification failed, retrying...');
                // Retry storage
                localStorage.setItem('token', userToken);
                localStorage.setItem('user', JSON.stringify(userData));
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log('[OAuth Callback] Storage verified, redirecting to dashboard...');

            // Use window.location.replace for a hard redirect (better for iOS)
            window.location.replace('/');
        };

        // Helper to decode token payload
        const decodeToken = (token: string) => {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    window.atob(base64)
                        .split('')
                        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                return JSON.parse(jsonPayload);
            } catch (e) {
                console.error('[OAuth Callback] Failed to decode token:', e);
                throw new Error('Invalid token format');
            }
        };

        // Main authentication flow
        const authenticateUser = async () => {
            try {
                // Import API client dynamically
                const { default: client } = await import('../../../../lib/api/client');

                // Create timeout promise (5 seconds)
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
                });

                // Fetch user profile with timeout
                const profilePromise = client.get('/users/me/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                try {
                    const response = await Promise.race([profilePromise, timeoutPromise]) as any;
                    const fullUser = response.data;

                    console.log('[OAuth Callback] Successfully fetched user profile');
                    await performLogin(token, fullUser);
                } catch (profileError: any) {
                    console.warn('[OAuth Callback] Profile fetch failed, using token fallback:', profileError.message);

                    // Fallback: decode token to get user info
                    const decoded = decodeToken(token);
                    const user = {
                        id: decoded.sub,
                        email: decoded.email,
                        name: decoded.name || 'User',
                        role: decoded.role,
                    };

                    console.log('[OAuth Callback] Using decoded token for user data');
                    await performLogin(token, user);
                }
            } catch (error: any) {
                console.error('[OAuth Callback] Authentication failed:', error);
                router.push(`/login?error=auth_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`);
            }
        };

        // Execute authentication flow
        authenticateUser();
    }, [searchParams, login, router]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-white text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-bold">Authenticating...</h2>
                <p className="text-slate-400">Please wait while we log you in.</p>
            </div>
        </div>
    );
}

export default function GoogleCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
