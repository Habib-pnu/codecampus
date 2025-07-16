
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, Institution, ClassGroup, AdminSupportRequest, Lab } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { initialMockUsers, initialMockInstitutions } from '@/lib/mock-data';

const ALL_USERS_STORAGE_KEY = 'codecampus_all_users';
const CURRENT_USER_STORAGE_KEY = 'codecampus_user';
const INSTITUTIONS_STORAGE_KEY = 'codecampus_institutions';

interface StoredUser extends User {
  passwordHash?: string;
}

interface NotificationData {
  classGroups: ClassGroup[];
  adminSupportRequests: AdminSupportRequest[];
  labs: Lab[];
}

interface UserContextType {
  user: User | null;
  allUsers: User[];
  institutions: Institution[];
  isLoading: boolean;
  notificationCount: number;
  notificationData: NotificationData;
  headerContent: React.ReactNode | null;
  setHeaderContent: (content: React.ReactNode | null) => void;
  setNotificationData: (data: NotificationData) => void;
  login: (userToLogin: User) => void;
  logout: () => void;
  updateCurrentUser: (updatedUser: User) => void;
  getStoredUsersWithPasswords: () => StoredUser[];
  persistAllUsers: (users: StoredUser[]) => void;
  setAllUsers: (users: User[]) => void;
  setInstitutions: (institutions: Institution[]) => void;
  setNotificationCount: (count: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [headerContent, setHeaderContent] = useState<React.ReactNode | null>(null);
  const [notificationData, setNotificationData] = useState<NotificationData>({ classGroups: [], adminSupportRequests: [], labs: [] });
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const loadDataFromStorage = useCallback(() => {
      // Load institutions
      const storedInstitutions = localStorage.getItem(INSTITUTIONS_STORAGE_KEY);
      let currentInstitutions: Institution[] = [];
      try {
        currentInstitutions = storedInstitutions ? JSON.parse(storedInstitutions) : initialMockInstitutions;
      } catch (e) {
        currentInstitutions = initialMockInstitutions;
      }
      if (currentInstitutions.length === 0) {
        currentInstitutions = initialMockInstitutions;
      }
      setInstitutions(currentInstitutions);

      // Load users
      const allUsersWithPasswords = getStoredUsersWithPasswords(currentInstitutions);
      const uiUsers = allUsersWithPasswords
          .map(({ passwordHash, ...user }) => user as User)
          .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
      setAllUsers(uiUsers);
  }, []);

  const getStoredUsersWithPasswords = useCallback((currentInstitutions?: Institution[]): StoredUser[] => {
    const storedAllUsers = typeof window !== 'undefined' ? localStorage.getItem(ALL_USERS_STORAGE_KEY) : null;
    let usersWithPasswords: StoredUser[] = [];
    
    const institutionsToUse = currentInstitutions || institutions;
    const defaultInstId = institutionsToUse.length > 0 ? institutionsToUse[0].id : 'default-institution-001';

    const ensureDefaultFields = (u: Partial<User & { passwordHash?: string }>): StoredUser => {
        const defaultUsername = u.username || `user_${(u.studentId || u.id || Date.now().toString()).slice(-4)}`;
        return {
            id: u.id || `temp-id-${Math.random().toString(36).substring(2, 9)}`,
            username: defaultUsername,
            no: u.no || `N/A`,
            studentId: u.studentId || `sid_${(u.id || Date.now().toString()).slice(-4)}`,
            fullName: u.fullName || 'Unknown User',
            email: u.email || `${defaultUsername}@example.com`,
            role: u.role || 'normal',
            isAdmin: u.isAdmin || false,
            mustChangePassword: u.mustChangePassword || false,
            completedExercises: Array.isArray(u.completedExercises) ? u.completedExercises : [],
            totalScore: typeof u.totalScore === 'number' ? u.totalScore : 0,
            enrolledClassIds: Array.isArray(u.enrolledClassIds) ? u.enrolledClassIds : [],
            pendingClassRequests: Array.isArray(u.pendingClassRequests) ? u.pendingClassRequests : [],
            passwordHash: u.passwordHash || 'defaultpass',
            institutionId: u.institutionId || defaultInstId,
            billingBalance: typeof u.billingBalance === 'number' ? u.billingBalance : 0,
            lastBillingCycleDate: u.lastBillingCycleDate,
        };
    };

    if (storedAllUsers) {
        try {
            const parsedUsers = JSON.parse(storedAllUsers);
            if (Array.isArray(parsedUsers) && parsedUsers.every(u => u && (u.id || u.studentId || u.username))) {
                usersWithPasswords = parsedUsers.map(u => ensureDefaultFields(u));
            } else {
                usersWithPasswords = initialMockUsers.map(u => ensureDefaultFields(u));
            }
        } catch (error) {
            usersWithPasswords = initialMockUsers.map(u => ensureDefaultFields(u));
        }
    } else {
        usersWithPasswords = initialMockUsers.map(u => ensureDefaultFields(u));
    }
    
    let adminUser = usersWithPasswords.find(u => u.username && u.username.toLowerCase() === 'admin');
    if (adminUser) {
        adminUser.role = 'lecturer';
        adminUser.isAdmin = true;
    } else {
        usersWithPasswords.push(ensureDefaultFields({
            id: 'admin-001',
            username: 'admin',
            role: 'lecturer',
            isAdmin: true,
            passwordHash: 'admin',
        }));
    }

    return usersWithPasswords.sort((a,b) => (a.fullName || "").localeCompare(b.fullName || ""));
  }, [institutions]);

  const updateCurrentUser = useCallback((updatedUser: User) => {
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }
  }, []);

  const persistAllUsers = useCallback((usersWithPasswords: StoredUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(usersWithPasswords));
      const currentUserInList = usersWithPasswords.find(u => u.id === user?.id);
      if(currentUserInList) {
          const { passwordHash, ...userForSession } = currentUserInList;
          updateCurrentUser(userForSession as User);
      }
    }
  }, [user?.id, updateCurrentUser]);


  const login = useCallback((userToLogin: User) => {
    setUser(userToLogin);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userToLogin));
    }
    // After logging in, reload data from storage to catch any updates from registration
    loadDataFromStorage();
    router.push('/dashboard');
  }, [router, loadDataFromStorage]);

  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
    router.push('/login');
    toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
  }, [router, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoading(true);
      const storedUserString = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUserString) {
        try {
          const parsedUser: User = JSON.parse(storedUserString);
          setUser(parsedUser);
        } catch (e) {
          localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          setUser(null);
        }
      } else {
          if (pathname !== '/login' && pathname !== '/register') {
              router.replace('/login');
          }
      }
      // Load all user and institution data on initial load
      loadDataFromStorage();
      setIsLoading(false);
    }
  }, [pathname, router, loadDataFromStorage]);

  const value = {
    user,
    allUsers,
    institutions,
    isLoading,
    notificationCount,
    notificationData,
    headerContent,
    setNotificationData,
    setHeaderContent,
    login,
    logout,
    updateCurrentUser,
    getStoredUsersWithPasswords,
    persistAllUsers,
    setAllUsers,
    setInstitutions,
    setNotificationCount,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
