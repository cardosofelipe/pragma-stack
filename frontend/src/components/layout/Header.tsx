/**
 * Header Component
 * Main navigation header for authenticated users
 * Includes logo, navigation links, and user menu
 */

'use client';

import Image from 'next/image';
import { Link } from '@/lib/i18n/routing';
import { usePathname } from '@/lib/i18n/routing';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLogout } from '@/lib/api/hooks/useAuth';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings, LogOut, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme';
import { LocaleSwitcher } from '@/components/i18n';

/**
 * Get user initials for avatar
 */
function getUserInitials(firstName?: string | null, lastName?: string | null): string {
  if (!firstName) return 'U';

  const first = firstName.charAt(0).toUpperCase();
  const last = lastName?.charAt(0).toUpperCase() || '';

  return `${first}${last}`;
}

/**
 * Navigation link component
 */
function NavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </Link>
  );
}

export function Header() {
  const t = useTranslations('navigation');
  const { user } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo-icon.svg"
              alt="PragmaStack Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-foreground">PragmaStack</span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink href="/" exact>
              {t('home')}
            </NavLink>
            {user?.is_superuser && <NavLink href="/admin">{t('admin')}</NavLink>}
          </nav>
        </div>

        {/* Right side - Theme toggle, locale switcher, and user menu */}
        <div className="ml-auto flex items-center space-x-2">
          <ThemeToggle />
          <LocaleSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback>
                    {getUserInitials(user?.first_name, user?.last_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  {t('profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/password" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settings')}
                </Link>
              </DropdownMenuItem>
              {user?.is_superuser && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    {t('adminPanel')}
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 dark:text-red-400"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? t('loggingOut') : t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
