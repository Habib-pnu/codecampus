
"use client";

import * as React from 'react';
import { UserProvider, useUser } from '@/context/user-context';
import { Header } from '@/components/layout/header';
import type { User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangePasswordDialog } from '@/components/auth/change-password-dialog';
import { EditProfileDialog } from '@/components/auth/edit-profile-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/language-context';
import { Toaster } from "@/components/ui/toaster-client";

interface StoredUser extends User {
  passwordHash?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { user, isLoading, logout, updateCurrentUser, getStoredUsersWithPasswords, persistAllUsers, hasUnreadMessages, headerContent } = useUser();
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const [showChangePasswordDialog, setShowChangePasswordDialog] = React.useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = React.useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = React.useState(false);

  const [editProfileUsername, setEditProfileUsername] = React.useState("");
  const [editProfileNo, setEditProfileNo] = React.useState("");
  const [editProfileStudentId, setEditProfileStudentId] = React.useState("");
  const [editProfileFullName, setEditProfileFullName] = React.useState("");
  const [editProfileEmail, setEditProfileEmail] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && !user && pathname !== '/login' && pathname !== '/register') {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  React.useEffect(() => {
    if (user) {
      if (user.mustChangePassword) {
        setShowChangePasswordDialog(true);
      }
      setEditProfileUsername(user.username);
      setEditProfileNo(user.no);
      setEditProfileStudentId(user.studentId);
      setEditProfileFullName(user.fullName);
      setEditProfileEmail(user.email);
    }
  }, [user]);

  const handleChangePasswordSubmit = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to change your password.", variant: "destructive" });
      return false;
    }

    const allUsers = getStoredUsersWithPasswords();
    const userIndex = allUsers.findIndex(u => u.id === user.id);

    if (userIndex === -1) {
      toast({ title: "Error", description: "Current user not found in database.", variant: "destructive" });
      return false;
    }

    const storedUserRecord = allUsers[userIndex];
    if (storedUserRecord.passwordHash !== currentPassword) {
      toast({ title: "Error", description: "Current password does not match.", variant: "destructive" });
      return false;
    }

    const updatedUserRecord = { ...storedUserRecord, passwordHash: newPassword, mustChangePassword: false };
    allUsers[userIndex] = updatedUserRecord;
    persistAllUsers(allUsers); 

    const { passwordHash, ...userForSession } = updatedUserRecord;
    updateCurrentUser(userForSession as User); 

    toast({ title: "Success", description: "Password changed successfully." });
    setShowChangePasswordDialog(false);
    return true;
  };

  const handleSelfUpdateProfileSubmit = async (data: {username: string; no: string; studentId: string; fullName: string; email: string}): Promise<boolean> => {
    if (!user) {
      toast({ title: "Error", description: "User not logged in.", variant: "destructive" });
      return false;
    }
    const allUsers = getStoredUsersWithPasswords();
    const conflictingUser = allUsers.find(u =>
      u.id !== user.id &&
      (u.username.toLowerCase() === data.username.toLowerCase() || u.email.toLowerCase() === data.email.toLowerCase())
    );

    if (conflictingUser) {
      toast({ title: "Update Failed", description: "Username or email already in use.", variant: "destructive" });
      return false;
    }
    
    const userIndex = allUsers.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
        const updatedUserWithPassword = { ...allUsers[userIndex], ...data };
        allUsers[userIndex] = updatedUserWithPassword;
        persistAllUsers(allUsers);
        
        const { passwordHash, ...userForSession } = updatedUserWithPassword;
        updateCurrentUser(userForSession as User);
        
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
        setShowEditProfileDialog(false);
        return true;
    }
    return false;
  };
  
  const handleSelfDeleteAccountConfirm = async () => {
    if (!user) return;
    const allUsers = getStoredUsersWithPasswords();
    const updatedUsers = allUsers.filter(u => u.id !== user.id);
    persistAllUsers(updatedUsers);
    
    logout();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 w-full px-4">
          <div className="container mx-auto h-16 flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-4">
          <Skeleton className="h-[calc(100vh-10rem)] w-full" />
        </main>
      </div>
    );
  }
  
  if (!user && (pathname === '/login' || pathname === '/register')) {
    return <>{children}</>;
  }

  if (!user) {
     return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Redirecting to login...</p>
        </div>
      );
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        onLogout={logout}
        onChangePassword={() => setShowChangePasswordDialog(true)}
        onEditProfile={() => setShowEditProfileDialog(true)}
        hasUnreadMessages={hasUnreadMessages}
        tabs={headerContent}
      />
      <main className="flex-1 mt-8">
        {user.mustChangePassword ? (
          <div className="container mx-auto px-4 md:px-6 lg:px-8 flex justify-center items-center h-full">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <CardTitle>{t('passwordChangeRequiredTitle')}</CardTitle>
                <CardDescription>
                {t('passwordChangeRequiredDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowChangePasswordDialog(true)}>{t('changePasswordNowButton')}</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
           children
        )}
      </main>
      {showChangePasswordDialog && (
        <ChangePasswordDialog
          isOpen={showChangePasswordDialog}
          onClose={() => {
            if (!user?.mustChangePassword) {
              setShowChangePasswordDialog(false);
            } else {
              toast({ title: t('actionRequiredToast'), description: t('actionRequiredToast'), variant:"destructive"});
            }
          }}
          onSubmit={handleChangePasswordSubmit}
        />
      )}
      {showEditProfileDialog && user && (
        <EditProfileDialog
          isOpen={showEditProfileDialog}
          onClose={() => setShowEditProfileDialog(false)}
          onSubmit={handleSelfUpdateProfileSubmit}
          initialUsername={editProfileUsername}
          initialNo={editProfileNo}
          initialStudentId={editProfileStudentId}
          initialFullName={editProfileFullName}
          initialEmail={editProfileEmail}
          onInitiateDeleteAccount={() => {
            setShowEditProfileDialog(false);
            setShowDeleteAccountDialog(true);
          }}
        />
      )}
      {showDeleteAccountDialog && user && (
        <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteAccountConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteAccountConfirmDesc', { username: user.username, studentId: user.studentId })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSelfDeleteAccountConfirm}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {t('deleteAccountConfirmButton')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Toaster />
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <UserProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </UserProvider>
  );
}
