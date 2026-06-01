'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Chrome, Github, Apple, Building, RadioTower } from 'lucide-react';

type Provider = 'google' | 'github' | 'apple' | 'azure' | 'stream';

interface SocialLoginButtonProps {
  provider: Provider;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const providerConfig: Record<Provider, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  hoverBgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  google: {
    name: 'Google',
    icon: Chrome,
    bgColor: 'bg-white',
    hoverBgColor: 'hover:bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
  },
  github: {
    name: 'GitHub',
    icon: Github,
    bgColor: 'bg-gray-900',
    hoverBgColor: 'hover:bg-gray-800',
    textColor: 'text-white',
    borderColor: 'border-gray-700',
  },
  apple: {
    name: 'Apple',
    icon: Apple,
    bgColor: 'bg-black',
    hoverBgColor: 'hover:bg-gray-900',
    textColor: 'text-white',
    borderColor: 'border-gray-700',
  },
  azure: {
    name: 'Microsoft',
    icon: Building,
    bgColor: 'bg-white',
    hoverBgColor: 'hover:bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
  },
  stream: {
    name: 'Stream',
    icon: RadioTower,
    bgColor: 'bg-blue-600',
    hoverBgColor: 'hover:bg-blue-700',
    textColor: 'text-white',
    borderColor: 'border-blue-700',
  },
};

export function SocialLoginButton({
  provider,
  onClick,
  disabled,
  loading,
}: SocialLoginButtonProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  return (
    <Button
      id={`btn-login-${provider}`}
      variant="ghost"
      className={cn(
        'w-full justify-start gap-3 border',
        config.bgColor,
        config.hoverBgColor,
        config.textColor,
        config.borderColor
      )}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Icon id={`icon-${provider}`} className="h-5 w-5" />
      <span>{loading ? 'Connecting...' : `Continue with ${config.name}`}</span>
    </Button>
  );
}
