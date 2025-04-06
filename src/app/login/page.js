"use client"

import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import signInWithGoogle from '../Firebase/signInWithGoogle';
import { Login } from './api/login';
import { useRouter } from 'next/navigation';

// Custom Toast Component
const Toast = ({ message, onClose }) => (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
        <div className="bg-black text-white px-6 py-4 flex items-center">
            <AlertCircle className="mr-2" size={20} />
            <p>{message}</p>
            <button
                onClick={onClose}
                className="ml-4 hover:text-gray-300"
            >
                ×
            </button>
        </div>
    </div>
);

const LoginPage = () => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const router = useRouter();
    
    // Check if user is already logged in
    useEffect(() => {
        const userId = localStorage.getItem('id');
        if (userId) {
            router.replace('/simulation');
        } else {
            setInitializing(false);
        }
    }, [router]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithGoogle();
            
            if (result.success) {
                const email = result.email;
                let response = await Login(email);
                
                if (response.success) {
                    localStorage.setItem('userEmail', email);
                    localStorage.setItem('id', response.data.id);
                    router.push('/simulation');
                } else {
                    setToastMessage("Error logging in. Please try again.");
                    setShowToast(true);
                }
            }
        } catch (error) {
            console.error("Login error:", error);
            setToastMessage("Sign-in failed. Please try again.");
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    // Show loading screen while checking if user is already logged in
    if (initializing) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 text-black animate-spin mb-4" />
                <p className="text-black">Initializing...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
            {/* Main Content */}
            <div className="w-full max-w-3xl">
                {/* Title Section */}
                <div className="text-center mb-16">
                    <h1 className="text-6xl font-bold text-black mb-4">Nash Equilibrium</h1>
                    <p className="text-gray-800 text-xl">Game Theory Simulator</p>
                </div>

                {/* Description */}
                <div className="mb-16 text-center max-w-2xl mx-auto">
                    <p className="text-lg text-gray-800">
                        Explore the fundamental concept of Nash Equilibrium in game theory through 
                        interactive simulations. Understand strategic decision-making in competitive scenarios.
                    </p>
                </div>

                {/* Google Sign In Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="flex items-center justify-center space-x-3 px-6 py-4 bg-white hover:bg-gray-100 text-black transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span>Signing in...</span>
                            </>
                        ) : (
                            <>
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                <span className="ml-2">Sign in with Google</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Info Text */}
                <div className="mt-16 text-center">
                    <p className="text-gray-800 text-lg mt-8">
                        A Nash Equilibrium occurs when no player can benefit by changing their strategy
                        while the other players keep theirs unchanged.
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <Toast
                    message={toastMessage}
                    onClose={() => setShowToast(false)}
                />
            )}

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .animate-slide-in {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;