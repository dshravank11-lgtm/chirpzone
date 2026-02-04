'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { GoogleIcon } from '@/components/icons/google-icon';
import { useToast } from '@/components/ui/use-toast';
import { signInWithGoogle, forgotPassword, auth } from '@/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'error'>('info');

  useEffect(() => {
    const reason = searchParams.get('reason');
    const redirect = searchParams.get('redirect');
    
    if (reason === 'session_revoked') {
      setSessionMessage('Your session was ended because you signed in on another device. For security, all other sessions were automatically signed out.');
      setMessageType('warning');
      
      // Show toast notification
      toast({
        title: "Session Ended",
        description: "You were signed out from other devices for security.",
        variant: "default",
      });
      
    } else if (reason === 'invalid_token') {
      setSessionMessage('Your session token has expired or is invalid. Please sign in again to continue.');
      setMessageType('error');
      
    } else if (reason === 'timeout') {
      setSessionMessage('Your session has timed out due to inactivity. Please sign in again.');
      setMessageType('info');
      
    } else if (reason === 'security') {
      setSessionMessage('For security reasons, your session was terminated. Please sign in again.');
      setMessageType('warning');
    }
    
    // If there was a redirect, show a message
    if (redirect) {
      toast({
        title: "Sign in required",
        description: "Please sign in to access that page.",
        variant: "default",
      });
    }
  }, [searchParams, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Check if there's a redirect URL
      const redirect = searchParams.get('redirect');
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting...',
      });
      
      // Redirect to original page or home
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        router.push('/');
      }
      
      // Force a small delay to show success message
      setTimeout(() => {
        router.refresh();
      }, 500);
      
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Handle specific error cases
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later or reset your password.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      
      const redirect = searchParams.get('redirect');
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        router.push('/');
      }
      
      setTimeout(() => {
        router.refresh();
      }, 500);
      
    } catch (error: any) {
      console.error('Google login failed:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login popup was closed. Please try again.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter your email to reset your password.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await forgotPassword(email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your email for instructions to reset your password. The link expires in 1 hour.',
      });
    } catch (error: any) {
      console.error('Forgot password failed:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many reset attempts. Please try again later.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Forgot Password Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertVariant = () => {
    switch (messageType) {
      case 'warning': return 'default';
      case 'error': return 'destructive';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const getAlertIcon = () => {
    switch (messageType) {
      case 'warning': return <ShieldAlert className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'info': return <RefreshCw className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center items-center">
            <div className="relative">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ffa600] to-orange-600 bg-clip-text text-transparent">
                Chirp
              </h1>
              <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-gradient-to-r from-[#ffa600] to-orange-600 animate-pulse"></div>
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome back!</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Session Messages */}
          {sessionMessage && (
            <Alert variant={getAlertVariant()} className="animate-in fade-in slide-in-from-top-5 duration-500">
              {getAlertIcon()}
              <AlertDescription className="font-medium">
                {sessionMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Security Notice */}
          <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-[#ffa600]" />
              <p className="text-sm font-medium">Security Notice</p>
            </div>
            <p className="text-xs text-muted-foreground">
              You can sign out of all other devices from your account settings after logging in.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-medium text-[#ffa600] hover:text-orange-600"
                  onClick={handleForgotPassword}
                  disabled={isLoading || isGoogleLoading}
                >
                  Forgot password?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                className="h-11"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-[#ffa600] to-orange-600 hover:from-orange-600 hover:to-[#ffa600] text-white font-semibold transition-all duration-300"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in with Email'
              )}
            </Button>
          </form>

          {/* Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full h-11 border-2 hover:bg-muted/50 transition-colors"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#ffa600] border-t-transparent mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <GoogleIcon className="mr-3 h-5 w-5" />
                Sign in with Google
              </>
            )}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link 
                href="/signup" 
                className="font-semibold text-[#ffa600] hover:text-orange-600 transition-colors"
              >
                Sign up here
              </Link>
            </p>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <Link 
                  href="/privacy-policy" 
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </p>
              <p>
                <Link 
                  href="/terms-of-service" 
                  className="hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add custom styles for gradient text */}
      <style jsx global>{`
        @keyframes gradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-gradient {
          animation: gradientMove 3s ease infinite;
          background-size: 200% 200%;
        }
      `}</style>
    </div>
  );
}