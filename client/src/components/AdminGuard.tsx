
import React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'wouter';
import { Button } from './ui/button';
import { Crown, Settings } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, isLoaded } = useAuth();
  
  if (!isLoaded || !user || (user.role !== "admin" && user.role !== "super_admin")) {
    return fallback || null;
  }
  
  return <>{children}</>;
}

export function AdminNavButton() {
  return (
    <AdminGuard>
      <Link href="/admin">
        <button className="whitespace-nowrap text-slate-600 hover:text-primary transition-colors text-xs md:text-sm flex items-center space-x-1">
          <Crown className="w-3 h-3" />
          <span>Admin</span>
        </button>
      </Link>
    </AdminGuard>
  );
}

export function AdminDropdownButton() {
  return (
    <AdminGuard>
      <Link href="/admin">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-600 mb-1"
        >
          <Settings className="w-4 h-4 mr-2" />
          Admin Panel
        </Button>
      </Link>
    </AdminGuard>
  );
}
