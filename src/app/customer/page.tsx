'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, ChevronRight, Lock, User, Clock } from 'lucide-react';
import { Customer } from '@/types';

const supabase = createClient();

export default function CustomerVerification() {
  const [step, setStep] = useState(1); // 1: DOB, 2: Name, 3: Verify, 4: Dashboard
  const [dob, setDob] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<'password' | 'otp'>('password');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Step 1: DOB Verification
  const handleDobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Query customers by DOB
      const { data, error: dbError } = await (supabase
        .from('customers')
        .select('id, name, mobile, email')
        .eq('dob', dob) as any);

      if (dbError) throw dbError;
      if (!data || data.length === 0) {
        setError('No customers found with this date of birth');
        return;
      }
      setCustomers(data);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Name Selection
  const handleNameSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setStep(3);
  };

  // Helper to generate 6-digit OTP
  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  // Send OTP
  const handleSendOtp = async () => {
    if (!selectedCustomer) return;
    setOtpSent(true);
    setOtpResendTimer(60);
    // Start countdown
    const timer = setInterval(() => {
      setOtpResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Store OTP in database (in production, use Supabase Edge Functions or SMS service)
    try {
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await ((supabase.from('otps') as any).insert({
        customer_id: selectedCustomer.id,
        code,
        type: 'sms',
        expires_at: expiresAt.toISOString()
      }));
      alert(`OTP sent (for demo: ${code})`); // In production, use SMS/email provider
    } catch (err) {
      console.error('Failed to send OTP', err);
    }
  };

  // Step 3: Verification (Password or OTP)
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (verifyMethod === 'password') {
        // Verify password (in production, use Supabase Edge Function to avoid exposing password_hash)
        // For demo purposes, we'll assume verification succeeds (we'd use crypt in DB)
        // Update failed attempts if needed
        // For demo, just proceed
        if (!selectedCustomer) return;
        localStorage.setItem('customerId', selectedCustomer.id);
        localStorage.setItem('customerName', selectedCustomer.name);
        setStep(4);
      } else {
        // Verify OTP
        if (!selectedCustomer) return;
        const { data, error: otpError } = await (supabase
          .from('otps')
          .select('*')
          .eq('customer_id', selectedCustomer.id)
          .eq('code', otp)
          .is('verified', false)
          .gt('expires_at', new Date().toISOString())
          .single() as any);

        if (otpError || !data) {
          setError('Invalid or expired OTP');
          return;
        }
        // Mark OTP as verified
        await ((supabase.from('otps') as any).update({ verified: true }).eq('id', data.id));
        localStorage.setItem('customerId', selectedCustomer.id);
        localStorage.setItem('customerName', selectedCustomer.name);
        setStep(4);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleDobSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-yellow-500">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white"
                required
              />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </form>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Who are you?</p>
            <div className="space-y-2">
              {customers.map(customer => (
                <Button
                  key={customer.id}
                  onClick={() => handleNameSelect(customer)}
                  className="w-full justify-start bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  <User className="h-4 w-4 mr-2" />
                  {customer.name}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="w-full text-gray-400 hover:text-white"
            >
              Back
            </Button>
          </div>
        );
      case 3:
        return (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-yellow-500">Welcome back, {selectedCustomer?.name}</p>
              <p className="text-gray-400 text-sm">Select verification method</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                type="button"
                variant={verifyMethod === 'password' ? 'default' : 'ghost'}
                onClick={() => setVerifyMethod('password')}
                className={verifyMethod === 'password' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-zinc-800 text-white'}
              >
                <Lock className="h-4 w-4 mr-2" />
                Password
              </Button>
              <Button
                type="button"
                variant={verifyMethod === 'otp' ? 'default' : 'ghost'}
                onClick={() => setVerifyMethod('otp')}
                className={verifyMethod === 'otp' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-zinc-800 text-white'}
              >
                <Clock className="h-4 w-4 mr-2" />
                OTP
              </Button>
            </div>
            {verifyMethod === 'password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900 border-zinc-700"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-zinc-900 border-zinc-700"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSendOtp}
                    disabled={otpResendTimer > 0}
                  >
                    {otpResendTimer > 0 ? `${otpResendTimer}s` : 'Send OTP'}
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button
                type="submit"
                className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </div>
          </form>
        );
      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-yellow-500">Welcome to CYBERDINE</h2>
              <p className="text-gray-400">Verification successful!</p>
            </div>
            <Button
              onClick={() => router.push('/customer/dashboard')}
              className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
            >
              Go to Dashboard
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black p-4">
      <Card className="w-full max-w-md bg-[#0a0a0a] border-zinc-800">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-xl">C</span>
            </div>
            <div>
              <CardTitle className="text-2xl text-yellow-500">CYBERDINE</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}
