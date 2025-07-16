
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from "@/types";
import { LogOut, KeyRound, UserCog, ShieldCheck, Bell } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onChangePassword: () => void;
  onEditProfile: () => void;
  notificationCount?: number;
  tabs?: React.ReactNode;
}

export function Header({ user, onLogout, onChangePassword, onEditProfile, notificationCount, tabs }: HeaderProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogoutClick = () => {
    onLogout();
  };

  const getInitial = (name: string | undefined | null): string => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (!user) {
    return (
       <header className="sticky top-0 z-40 w-full">
         <div className="container mx-auto h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          </Link>
        </div>
      </header>
    );
  }

  const userInitial = getInitial(user.fullName);
  const avatarSrc = user?.username ? `https://api.dicebear.com/8.x/initials/svg?seed=${user.username}` : `https://placehold.co/100x100.png?text=${userInitial}`;


  return (
    <header className="sticky top-4 z-40 w-full px-4">
      <div className={cn("container mx-auto h-14 items-center justify-between flex", 
          "rounded-full border border-white/10 bg-slate-900/40 shadow-lg backdrop-blur-xl px-4"
        )}>
        
        {tabs ? (
          <div className="flex-1 min-w-0">{tabs}</div>
        ) : (
          <div className="flex-1"></div>
        )}

        {user && (
          <div className="flex items-center gap-2 pl-4">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative">
                <Bell className="h-5 w-5" />
                {notificationCount && notificationCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-slate-900/40">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarSrc} alt={user.fullName || "User Avatar"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                     <p className="text-xs leading-none text-muted-foreground">
                       {t('headerUsernameLabel')}: {user.username}
                    </p>
                    {(user.role !== 'lecturer') && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {t('noLabel')}: {user.no} / {t('studentIdLabel')}: {user.studentId}
                      </p>
                    )}
                    <p className="text-xs leading-none text-muted-foreground">
                      {t('emailLabel')}: {user.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground capitalize flex items-center">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      {t('headerRoleLabel')}: {user.role} {user.role === 'lecturer' && user.isAdmin && '(Global Admin)'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEditProfile} className="cursor-pointer">
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>{t('headerEditProfile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onChangePassword} className="cursor-pointer">
                  <KeyRound className="mr-2 h-4 w-4" />
                  <span>{t('headerChangePassword')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogoutClick} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('headerLogout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
