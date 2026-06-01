import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUpWithUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username may only contain letters, digits, and underscores.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please accept the User Agreement and Privacy Policy to continue.');
      return;
    }

    setIsLoading(true);
    const { error: authError } = await signUpWithUsername(username.trim(), password);
    setIsLoading(false);

    if (authError) {
      if (authError.message?.includes('already registered')) {
        setError('This username is already taken. Please choose another.');
      } else {
        setError(authError.message ?? 'Registration failed. Please try again.');
      }
    } else {
      toast.success('Account created! Welcome to SafeProof.');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded bg-primary/10 border border-primary/20">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">SafeProof</h1>
            <p className="text-sm text-muted-foreground mt-1">Create your secure account</p>
          </div>
        </div>

        <Card className="border border-border shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-balance">Create Account</CardTitle>
            <CardDescription className="text-sm text-pretty">
              Start organizing your evidence securely
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-normal">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={isLoading}
                  className="px-3"
                />
                <p className="text-xs text-muted-foreground">Letters, digits, and underscores only</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-normal">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={isLoading}
                    className="px-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-normal">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="px-3"
                />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(Boolean(v))}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{' '}
                  <span className="text-primary underline cursor-pointer">User Agreement</span>
                  {' '}and{' '}
                  <span className="text-primary underline cursor-pointer">Privacy Policy</span>
                  {'. '}
                  Your information is kept strictly confidential.
                </label>
              </div>

              <Button type="submit" className="w-full h-9 font-semibold" disabled={isLoading || !agreed}>
                {isLoading ? 'Creating account…' : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4 px-4 text-pretty">
          SafeProof is designed to help you document incidents safely and securely.
        </p>
      </div>
    </div>
  );
}
