'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialLoginButton } from '@/components/SocialLoginButton';
import { AuthService, getErrorMessage } from '@/lib/auth-utils';
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  Star,
  Menu,
  X,
  Gamepad2,
  MonitorPlay,
  Wifi,
  Calendar,
  Users,
  UtensilsCrossed,
  Zap,
  ShieldCheck,
  Clock,
  Award
} from 'lucide-react';

const goals = [
  "Play games with friends",
  "Watch a movie",
  "Browse the internet",
  "Work remotely",
  "Host a party",
  "Other"
];

const services = [
  {
    id: 'service-gaming',
    icon: Gamepad2,
    title: 'Premium Gaming',
    description: 'High-end gaming stations with latest hardware',
    href: '#',
    color: '#ef4444'
  },
  {
    id: 'service-movies',
    icon: MonitorPlay,
    title: 'Movie Pods',
    description: 'Private, immersive theater experiences',
    href: '#',
    color: '#f59e0b'
  },
  {
    id: 'service-internet',
    icon: Wifi,
    title: 'Internet Access',
    description: 'Fast, reliable fiber internet',
    href: '#',
    color: '#3b82f6'
  },
  {
    id: 'service-reservations',
    icon: Calendar,
    title: 'Easy Reservations',
    description: 'Book your spot in advance',
    href: '#',
    color: '#8b5cf6'
  },
  {
    id: 'service-members',
    icon: Users,
    title: 'Membership Plans',
    description: 'Get exclusive benefits and discounts',
    href: '#',
    color: '#10b981'
  },
  {
    id: 'service-food',
    icon: UtensilsCrossed,
    title: 'Food & Beverages',
    description: 'Delicious food and drinks delivered',
    href: '#',
    color: '#ec4899'
  }
];

const valueProps = [
  {
    id: 'value-speed',
    icon: Zap,
    title: 'Lightning Fast',
    description: 'High-speed internet and powerful hardware'
  },
  {
    id: 'value-safe',
    icon: ShieldCheck,
    title: 'Secure & Clean',
    description: 'Safe environment with regular sanitization'
  },
  {
    id: 'value-flexible',
    icon: Clock,
    title: 'Flexible Hours',
    description: 'Open late, available when you need it'
  },
  {
    id: 'value-quality',
    icon: Award,
    title: 'Premium Quality',
    description: 'Top-notch equipment and service'
  }
];

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'age' | 'register' | 'success'>('age');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dob, setDob] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cyberdine-dob') || '';
    }
    return '';
  });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    occupation: '',
    goal: '',
    customGoal: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const authService = AuthService.getInstance();

  const handleSocialLogin = async (provider: 'google' | 'github' | 'apple' | 'azure' | 'stream') => {
    setLoadingProvider(provider);
    setAuthError(null);
    const result = await authService.loginWithProvider(provider);
    setLoadingProvider(null);
    if (!result.success) {
      setAuthError(getErrorMessage(result.error!));
    }
  };

  // Calculate age from DOB
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validateAge = () => {
    if (!dob) {
      setErrors({ dob: 'Please enter your date of birth' });
      return;
    }
    const age = calculateAge(dob);
    if (age < 15) {
      setErrors({ dob: 'Sorry, you must be at least 15 years old to use CYBERDINE' });
      return;
    }
    // Store DOB in localStorage for future visits
    if (typeof window !== 'undefined') {
      localStorage.setItem('cyberdine_dob', dob);
    }
    setStep('register');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    const selectedGoal = formData.goal === 'Other' ? formData.customGoal : formData.goal;
    if (!selectedGoal.trim()) {
      newErrors.goal = 'Please select or enter your goal';
    }
    if (!agreed) {
      newErrors.agreed = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setStep('success');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      {/* Navigation */}
      <nav id="nav-main" className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link
              id="brand-link"
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div id="brand-logo" className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span id="brand-logo-text" className="text-black font-bold text-xl">C</span>
              </div>
              <span id="brand-text" className="text-xl font-bold">CYBERDINE</span>
            </Link>

            {/* Desktop Navigation Menu */}
            <div id="nav-menu-desktop" className="hidden md:flex items-center gap-8">
              <Link href="#services" id="nav-link-services" className="text-zinc-300 hover:text-yellow-500 transition-colors">
                Services
              </Link>
              <Link href="#value-prop" id="nav-link-value" className="text-zinc-300 hover:text-yellow-500 transition-colors">
                Why Us
              </Link>
              <Link href="#features" id="nav-link-features" className="text-zinc-300 hover:text-yellow-500 transition-colors">
                Features
              </Link>
              <Link href="#" id="nav-link-pricing" className="text-zinc-300 hover:text-yellow-500 transition-colors">
                Pricing
              </Link>
              <Button
                id="btn-staff-login"
                variant="ghost"
                className="text-zinc-300 hover:text-white"
                onClick={() => router.push('/login')}
              >
                Staff Login
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              id="btn-menu-toggle"
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X id="icon-menu-close" className="h-6 w-6" /> : <Menu id="icon-menu-open" className="h-6 w-6" />}
            </Button>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <div id="nav-menu-mobile" className="md:hidden py-4 border-t border-zinc-800 space-y-2">
              <Link
                id="nav-link-mobile-services"
                href="#services"
                className="block py-2 text-zinc-300 hover:text-yellow-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Services
              </Link>
              <Link
                id="nav-link-mobile-value"
                href="#value-prop"
                className="block py-2 text-zinc-300 hover:text-yellow-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Why Us
              </Link>
              <Link
                id="nav-link-mobile-features"
                href="#features"
                className="block py-2 text-zinc-300 hover:text-yellow-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                id="nav-link-mobile-pricing"
                href="#"
                className="block py-2 text-zinc-300 hover:text-yellow-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Button
                id="btn-staff-login-mobile"
                variant="ghost"
                className="w-full justify-start text-zinc-300 hover:text-white"
                onClick={() => {
                  router.push('/login');
                  setIsMenuOpen(false);
                }}
              >
                Staff Login
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {step === 'age' && (
            <div className="space-y-20">
              {/* Hero Section */}
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 id="hero-title" className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                    <span className="text-yellow-500">Time</span> is Malleable.
                    <br />
                    Shape It Wisely.
                  </h1>
                  <p id="hero-subtitle" className="text-xl text-zinc-400 max-w-2xl mx-auto">
                    Your premium destination for gaming, movies, and internet access in one place.
                  </p>
                </div>

                {/* Age Verification Card */}
                <Card id="card-age-verify" className="max-w-md mx-auto bg-zinc-900/80 border-zinc-700">
                  <CardHeader>
                    <CardTitle id="title-age-verify" className="flex items-center justify-center gap-2">
                      <Info id="icon-age-info" className="h-5 w-5 text-yellow-500" />
                      Verify Your Age
                    </CardTitle>
                    <CardDescription id="desc-age-verify" className="text-zinc-400">
                      Please confirm you are at least 15 years old to continue
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label id="label-dob" htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                        required
                      />
                      {errors.dob && (
                        <p id="error-dob" className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle id="icon-error-dob" className="h-4 w-4" />
                          {errors.dob}
                        </p>
                      )}
                    </div>
                    <Button
                      id="btn-age-continue"
                      onClick={validateAge}
                      className="w-full bg-yellow-500 text-black hover:bg-yellow-400"
                      disabled={!dob}
                    >
                      Continue <ChevronRight id="icon-chevron-right" className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Services Section */}
              <section id="services" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 id="title-services" className="text-3xl font-bold mb-4">Our Services</h2>
                  <p id="desc-services" className="text-zinc-400">Everything you need for an amazing experience</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => {
                    const Icon = service.icon;
                    return (
                      <Link
                        key={service.id}
                        href={service.href}
                        id={service.id}
                        className="group"
                      >
                        <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all">
                          <CardContent className="pt-6">
                            <div
                              id={`${service.id}-icon`}
                              className="h-12 w-12 rounded-lg flex items-center justify-center mb-4"
                              style={{ backgroundColor: service.color }}
                            >
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 id={`${service.id}-title`} className="text-lg font-semibold mb-2 group-hover:text-yellow-500 transition-colors">
                              {service.title}
                            </h3>
                            <p id={`${service.id}-desc`} className="text-zinc-400 text-sm">
                              {service.description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Value Proposition Section */}
              <section id="value-prop" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 id="title-value-prop" className="text-3xl font-bold mb-4">Why Choose Us</h2>
                  <p id="desc-value-prop" className="text-zinc-400">We stand out from the competition</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {valueProps.map((prop) => {
                    const Icon = prop.icon;
                    return (
                      <Card
                        key={prop.id}
                        id={prop.id}
                        className="bg-zinc-900/50 border-zinc-800"
                      >
                        <CardContent className="pt-6 text-center">
                          <div id={`${prop.id}-icon`} className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                            <Icon className="h-6 w-6 text-yellow-500" />
                          </div>
                          <h3 id={`${prop.id}-title`} className="text-lg font-semibold mb-2">
                            {prop.title}
                          </h3>
                          <p id={`${prop.id}-desc`} className="text-zinc-400 text-sm">
                            {prop.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>

              {/* Features Section */}
              <section id="features" className="scroll-mt-20">
                <div className="text-center mb-12">
                  <h2 id="title-features" className="text-3xl font-bold mb-4">What We Offer</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'feat-gaming', icon: '🎮', title: 'Gaming', desc: 'High-end gaming stations' },
                    { id: 'feat-movies', icon: '🎬', title: 'Movie Pods', desc: 'Private theater experience' },
                    { id: 'feat-internet', icon: '🌐', title: 'Internet', desc: 'Fast, reliable internet' },
                  ].map((feature) => (
                    <Card key={feature.id} id={feature.id} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="pt-6">
                        <div id={`${feature.id}-icon`} className="text-4xl mb-3">{feature.icon}</div>
                        <h3 id={`${feature.id}-title`} className="text-lg font-semibold mb-2">{feature.title}</h3>
                        <p id={`${feature.id}-desc`} className="text-zinc-400 text-sm">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          )}

          {step === 'register' && (
            <Card id="card-register" className="max-w-2xl mx-auto bg-zinc-900/80 border-zinc-700">
              <CardHeader>
                <CardTitle id="title-register" className="text-2xl">Join CYBERDINE</CardTitle>
                <CardDescription id="desc-register" className="text-zinc-400">
                  Create an account to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                {authError && (
                  <div id="auth-error-alert" className="flex items-start gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-md">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <p id="auth-error-text" className="text-sm text-red-200">{authError}</p>
                  </div>
                )}

                {/* Social Login Buttons */}
                <div id="social-login-container" className="space-y-3 mb-6">
                  <SocialLoginButton provider="google" onClick={() => handleSocialLogin('google')} loading={loadingProvider === 'google'} />
                  <SocialLoginButton provider="github" onClick={() => handleSocialLogin('github')} loading={loadingProvider === 'github'} />
                  <SocialLoginButton provider="apple" onClick={() => handleSocialLogin('apple')} loading={loadingProvider === 'apple'} />
                  <SocialLoginButton provider="azure" onClick={() => handleSocialLogin('azure')} loading={loadingProvider === 'azure'} />
                  <SocialLoginButton provider="stream" onClick={() => handleSocialLogin('stream')} loading={loadingProvider === 'stream'} />
                </div>

                {/* Divider */}
                <div id="divider-container" className="relative mb-6">
                  <div id="divider-line" className="absolute inset-0 flex items-center">
                    <span id="divider-border" className="w-full border-t border-zinc-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span id="divider-text" className="bg-[#0a0a0a] px-2 text-zinc-500">Or continue with email</span>
                  </div>
                </div>

                <form id="form-register" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label id="label-fullname" htmlFor="fullName">Full Legal Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="bg-zinc-800 border-zinc-700"
                        required
                      />
                      {errors.fullName && (
                        <p id="error-fullname" className="text-red-400 text-sm">{errors.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label id="label-dob-register" htmlFor="dob-register">Date of Birth</Label>
                      <Input
                        id="dob-register"
                        type="date"
                        value={dob}
                        disabled
                        className="bg-zinc-800 border-zinc-700 opacity-70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label id="label-email" htmlFor="email">Work Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-zinc-800 border-zinc-700"
                        required
                      />
                      {errors.email && (
                        <p id="error-email" className="text-red-400 text-sm">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label id="label-occupation" htmlFor="occupation">Current Occupation (Optional)</Label>
                      <Input
                        id="occupation"
                        placeholder="e.g., Software Engineer, Student"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label id="label-goal">What do you want to accomplish today? *</Label>
                    <div id="goal-options" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {goals.map((goal, i) => (
                        <button
                          key={goal}
                          id={`goal-${i}`}
                          type="button"
                          onClick={() => setFormData({ ...formData, goal })}
                          className={`p-3 rounded-lg border text-left text-sm transition-all ${
                            formData.goal === goal
                              ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500'
                              : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          {goal}
                        </button>
                      ))}
                    </div>
                    {formData.goal === 'Other' && (
                      <Input
                        id="custom-goal"
                        placeholder="Tell us your goal..."
                        value={formData.customGoal}
                        onChange={(e) => setFormData({ ...formData, customGoal: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 mt-2"
                      />
                    )}
                    {errors.goal && (
                      <p id="error-goal" className="text-red-400 text-sm">{errors.goal}</p>
                    )}
                  </div>

                  <div id="terms-section" className="border-t border-zinc-800 my-6 pt-6 space-y-4">
                    <Card id="card-account-required" className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          <Info id="icon-info-account" className="h-5 w-5 text-zinc-400 mt-0.5" />
                          <div>
                            <p id="text-account-required" className="font-medium">Account Required</p>
                            <p id="text-account-desc" className="text-sm text-zinc-400">
                              Creating an account is required to access our full features including reservations, session tracking, and personalized recommendations.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div id="terms-checkbox-container" className="flex items-start gap-3">
                      <button
                        id="terms-checkbox"
                        type="button"
                        onClick={() => setAgreed(!agreed)}
                        className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          agreed ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-600'
                        }`}
                      >
                        {agreed && <CheckCircle2 id="icon-check-terms" className="h-3 w-3 text-black" />}
                      </button>
                      <label id="terms-label" className="text-sm text-zinc-300">
                        I have read and agree to the{' '}
                        <a id="link-terms" href="#" className="text-yellow-500 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a id="link-privacy" href="#" className="text-yellow-500 hover:underline">Privacy Policy</a>
                      </label>
                    </div>
                    {errors.agreed && (
                      <p id="error-agreed" className="text-red-400 text-sm">{errors.agreed}</p>
                    )}
                  </div>

                  <div id="register-buttons" className="flex gap-3">
                    <Button
                      id="btn-back"
                      type="button"
                      variant="ghost"
                      onClick={() => setStep('age')}
                    >
                      Back
                    </Button>
                    <Button
                      id="btn-create-account"
                      type="submit"
                      className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400"
                    >
                      Create Account
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
            <div id="success-section" className="text-center space-y-6">
              <div id="success-icon-container" className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
                <CheckCircle2 id="icon-success" className="h-10 w-10 text-green-500" />
              </div>
              <h2 id="title-success" className="text-3xl font-bold">Welcome to CYBERDINE!</h2>
              <p id="text-success" className="text-zinc-400 max-w-md mx-auto">
                Your account has been created successfully. Redirecting you to your personalized dashboard...
              </p>
              <div id="goal-display" className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                <Star id="icon-star-goal" className="h-4 w-4 text-yellow-500" />
                <span id="text-goal-display" className="text-yellow-500 font-medium">
                  Goal: {formData.goal === 'Other' ? formData.customGoal : formData.goal}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer id="footer-main" className="border-t border-zinc-800 bg-black/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p id="footer-copyright" className="text-zinc-500 text-sm">
              © {new Date().getFullYear()} CYBERDINE. All rights reserved.
            </p>
            <div id="footer-links" className="flex gap-6">
              <a id="footer-link-privacy" href="#" className="text-zinc-400 hover:text-white text-sm">Privacy Policy</a>
              <a id="footer-link-terms" href="#" className="text-zinc-400 hover:text-white text-sm">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
