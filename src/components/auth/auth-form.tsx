
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ModalDescription, DialogFooter as ModalDialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { User, Institution } from "@/types";
import { Eye, EyeOff, LogIn, UserPlus, MailQuestion, Building } from "lucide-react";
import { initialMockUsers, initialMockInstitutions } from "@/lib/mock-data";
import { useLanguage } from "@/context/language-context";

interface AuthFormProps {
  mode: "login" | "register";
}

const ALL_USERS_STORAGE_KEY = 'codecampus_all_users';
const CURRENT_USER_STORAGE_KEY = 'codecampus_user';
const INSTITUTIONS_STORAGE_KEY = 'codecampus_institutions';
const NEW_INSTITUTION_VALUE = "__NEW_INSTITUTION__";


interface StoredUser extends User {
  passwordHash?: string;
}

export function AuthForm({ mode }: AuthFormProps) {
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [usernameInput, setUsernameInput] = useState("");
  const [noInput, setNoInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [forgotPasswordEmailInput, setForgotPasswordEmailInput] = useState("");
  const [showLoginErrorDialog, setShowLoginErrorDialog] = useState(false);

  const [registrationErrorMessage, setRegistrationErrorMessage] = useState("");
  const [showRegistrationErrorDialog, setShowRegistrationErrorDialog] = useState(false);
  const [institutionsList, setInstitutionsList] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [showNewInstitutionInput, setShowNewInstitutionInput] = useState(false);
  const [newInstitutionName, setNewInstitutionName] = useState("");


  useEffect(() => {
    // This effect runs once on component mount to ensure localStorage is seeded with initial data.
    try {
        let currentInstitutions: Institution[] = [];
        const storedInstitutionsJson = localStorage.getItem(INSTITUTIONS_STORAGE_KEY);
        if (storedInstitutionsJson) {
            currentInstitutions = JSON.parse(storedInstitutionsJson);
        } else {
            currentInstitutions = initialMockInstitutions;
            localStorage.setItem(INSTITUTIONS_STORAGE_KEY, JSON.stringify(currentInstitutions));
        }
        setInstitutionsList(currentInstitutions);
        if (currentInstitutions.length > 0 && !selectedInstitutionId) {
            setSelectedInstitutionId(currentInstitutions[0].id);
        }

        const storedUsersJson = localStorage.getItem(ALL_USERS_STORAGE_KEY);
        if (!storedUsersJson) {
            const allUsersWithPasswords = initialMockUsers.map(u => ({
                ...u,
                passwordHash: u.username === 'admin' ? 'admin' : 'password', 
            }));
            localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsersWithPasswords));
        }
    } catch (e) {
        console.error("Error initializing local storage data:", e);
        // Fallback to defaults if parsing fails
        localStorage.setItem(INSTITUTIONS_STORAGE_KEY, JSON.stringify(initialMockInstitutions));
        setInstitutionsList(initialMockInstitutions);
        if (initialMockInstitutions.length > 0) {
            setSelectedInstitutionId(initialMockInstitutions[0].id);
        }
        const allUsersWithPasswords = initialMockUsers.map(u => ({
            ...u,
            passwordHash: u.username === 'admin' ? 'admin' : 'password',
        }));
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsersWithPasswords));
    }
  }, [selectedInstitutionId]);



  const getStoredUsers = (): StoredUser[] => {
    const usersJson = localStorage.getItem(ALL_USERS_STORAGE_KEY);
    if (!usersJson) {
      return [];
    }
    try {
      return JSON.parse(usersJson) as StoredUser[];
    } catch (error) {
      console.error("Error reading stored users for auth:", error);
      return [];
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    // Give a brief moment for the loading spinner to appear, improving UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const storedUsers = getStoredUsers();
    let finalUserForSession: User | null = null;
    let successTitle = "";
    let successDescription = "";

    if (mode === "register") {
      // --- Pre-flight validation checks ---
      if (!usernameInput.trim() || !fullNameInput.trim() || !emailInput.trim() || !password.trim()) {
        const message = t('fillAllFieldsError');
 setRegistrationErrorMessage(message);
 setShowRegistrationErrorDialog(true);
        setIsLoading(false);
 return;
      }
       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
        const message = t('validEmailError');
 setRegistrationErrorMessage(message);
 setShowRegistrationErrorDialog(true);
        setIsLoading(false);
        return;
      }
      if (storedUsers.some(u => u.username.toLowerCase() === usernameInput.trim().toLowerCase())) {
        const message = t('usernameExistsError');
        setRegistrationErrorMessage(message);
        setShowRegistrationErrorDialog(true);
        setIsLoading(false);
        return;
      }
      if (storedUsers.some(u => u.email.toLowerCase() === emailInput.trim().toLowerCase())) {
        const message = t('emailExistsError');
        setRegistrationErrorMessage(message);
        setShowRegistrationErrorDialog(true);
        setIsLoading(false);
        return;
      }

      let finalInstitutionId = selectedInstitutionId;
      let institutionsToPersist = [...institutionsList];

      if (finalInstitutionId === NEW_INSTITUTION_VALUE) {
        if (!newInstitutionName.trim()) {
            setRegistrationErrorMessage(t('newInstitutionNameRequired'));
            setShowRegistrationErrorDialog(true);
            setIsLoading(false);
            return;
        }
        // This part is now safe because all user validations have passed.
        const newInstitution: Institution = { // Simplified Institution creation
            id: `inst-${Date.now()}`,
            name: newInstitutionName.trim(),
            pricePerStudent: 5, // Default price, can be changed by admin
            adminUserIds: [],
        };
        institutionsToPersist = [...institutionsList, newInstitution];
        finalInstitutionId = newInstitution.id;
      }
      
      localStorage.setItem(INSTITUTIONS_STORAGE_KEY, JSON.stringify(institutionsToPersist));
      setInstitutionsList(institutionsToPersist);
      
      const newUserWithPassword: StoredUser = {
        id: Date.now().toString() + Math.random().toString(36).substring(2,9),
        username: usernameInput.trim(),
        no: noInput.trim() || "-",
        studentId: studentIdInput.trim() || "-",
        fullName: fullNameInput.trim(),
        email: emailInput.trim(),
        role: 'normal',
        isAdmin: false,
        mustChangePassword: false,
        completedExercises: [],
        totalScore: 0,
        enrolledClassIds: [],
        pendingClassRequests: [],
        passwordHash: password.trim(),
        institutionId: finalInstitutionId,
      };
      const updatedUsers = [...storedUsers, newUserWithPassword];
      localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

      const { passwordHash, ...userForSession } = newUserWithPassword;
      finalUserForSession = userForSession;
      successTitle = t('registerSuccessTitle');
      successDescription = t('welcomeUser', { fullName: finalUserForSession.fullName });
      
      // Add toast for successful registration
      toast({ title: successTitle, description: successDescription });

    } else { // Login mode
      if (!usernameInput.trim() || !password.trim()) {
        toast({ title: t('errorToast'), description: t('fillAllFieldsError', { field: '' }), variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const loginIdentifier = usernameInput.trim().toLowerCase();
      const foundUserWithPassword = storedUsers.find(
        u => u.username.toLowerCase() === loginIdentifier || u.email.toLowerCase() === loginIdentifier
      );

      if (!foundUserWithPassword || foundUserWithPassword.passwordHash !== password.trim()) {
        setShowLoginErrorDialog(true);
        setIsLoading(false);
        return;
      }

      const { passwordHash, ...userForSession } = foundUserWithPassword;
      let finalIsAdmin = userForSession.isAdmin || false;
      let finalRole = userForSession.role || 'normal';
      if(userForSession.username && userForSession.username.toLowerCase() === 'admin'){
        finalIsAdmin = true;
        finalRole = 'lecturer';
      }

      finalUserForSession = {
        ...userForSession,
        isAdmin: finalIsAdmin,
        role: finalRole,
      };
      successTitle = t('loginSuccessTitle');
      successDescription = t('welcomeUser', { fullName: finalUserForSession.fullName });
    }

    if (finalUserForSession) {
      setIsLoading(false);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(finalUserForSession));
      router.push("/dashboard");
    } else {
      toast({ title: t('errorToast'), description: t('unexpectedError'), variant: "destructive"})
      setIsLoading(false); // Ensure loading is turned off even on unexpected errors
    }
  };

  const handleForgotPasswordSubmit = () => {
    if (!forgotPasswordEmailInput.trim()) {
      toast({ title: t('errorToast'), description: t('forgotPasswordEmailPlaceholder'), variant: "destructive" });
      return;
    }
     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmailInput.trim())) {
      toast({ title: t('errorToast'), description: t('validEmailError'), variant: "destructive" });
      return;
    }

    const allUsers = getStoredUsers();
    const userIndex = allUsers.findIndex(u => u.email.toLowerCase() === forgotPasswordEmailInput.trim().toLowerCase());

    if (userIndex === -1) {
        toast({
            title: t('errorToast'),
            description: t('emailNotFoundError', { email: forgotPasswordEmailInput }),
            variant: "destructive"
        });
    } else {
        const temporaryPassword = "password123";
        allUsers[userIndex].passwordHash = temporaryPassword;
        allUsers[userIndex].mustChangePassword = true;
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsers));
        
        toast({
            title: t('passwordResetSuccessTitle'),
            description: t('passwordResetSuccessDesc', { tempPass: temporaryPassword }),
            duration: 10000 // Give user more time to read the temporary password
        });
    }

    setForgotPasswordEmailInput("");
    setShowForgotPasswordDialog(false);
  };
  
  const handleInstitutionChange = (value: string) => {
    setSelectedInstitutionId(value);
    if (value === NEW_INSTITUTION_VALUE) {
        setShowNewInstitutionInput(true);
    } else {
        setShowNewInstitutionInput(false);
        setNewInstitutionName("");
    }
  };


  const titleText = mode === "login" ? t('loginTitle') : t('registerTitle');
  const descriptionText = mode === "login" ? t('loginDescription') : t('registerDescription');
  const buttonText = mode === "login" ? t('loginButton') : t('registerButton');
  const switchModeText = mode === "login" ? t('switchToRegister') : t('switchToLogin');
  const switchModeLink = mode === "login" ? "/register" : "/login";

  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center relative">
            <div className="absolute top-2 right-2 flex gap-1">
                <Button variant={language === 'th' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2" onClick={() => setLanguage('th')}>TH</Button>
                <Button variant={language === 'en' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2" onClick={() => setLanguage('en')}>EN</Button>
            </div>
            <CardTitle className="text-3xl font-bold pt-8">{titleText}</CardTitle>
            <CardDescription>{descriptionText}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="institution-select">{t('institutionLabel')}</Label>
                    <Select value={selectedInstitutionId} onValueChange={handleInstitutionChange} required>
                      <SelectTrigger id="institution-select" className="w-full">
                        <SelectValue placeholder={t('institutionPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {institutionsList.length > 0 ? (
                          institutionsList.map(inst => (
                            <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">{t('noInstitutionOption')}</div>
                        )}
                        <SelectItem value={NEW_INSTITUTION_VALUE}>Other (Please specify)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {showNewInstitutionInput && (
                    <div className="space-y-2">
                        <Label htmlFor="new-institution-name">New Institution Name</Label>
                        <Input
                            id="new-institution-name"
                            type="text"
                            placeholder="Enter your institution's name"
                            value={newInstitutionName}
                            onChange={(e) => setNewInstitutionName(e.target.value)}
                            required
                        />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-username">{t('usernameLabel')}</Label>
                    <Input // Username input for registration
                      id="register-username"
                      type="text"
                      placeholder={t('usernamePlaceholder')}
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-no">{t('noLabel')}</Label>
                    <Input
                      id="register-no"
                      type="text"
                      placeholder={t('noPlaceholder')}
                      value={noInput}
                      onChange={(e) => setNoInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-student-id">{t('studentIdLabel')}</Label>
                    <Input
                      id="register-student-id"
                      type="text"
                      placeholder={t('studentIdPlaceholder')}
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="email">{t('emailLabel')}</Label>
                    <Input // Email input
                      id="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('fullNameLabel')}</Label>
                    <Input // Full Name input
                      id="fullName"
                      type="text"
                      placeholder={t('fullNamePlaceholder')}
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </>
              )}
              {mode === "login" && (
                <div className="space-y-2">
                    <Label htmlFor="login-username">{t('usernameOrEmailLabel')}</Label>
                    <Input
                    id="login-username"
                    type="text"
                    placeholder={t('usernameOrEmailPlaceholder')}
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                    autoComplete="username"
                    />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  {mode === "login" && (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => setShowForgotPasswordDialog(true)}
                    >
                      {t('forgotPasswordLink')}
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password" // Password input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === 'login' ? t('loginPasswordPlaceholder') : t('registerPasswordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('hidePasswordAria') : t('showPasswordAria')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? t('processing') : (
                  <>
                    {mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    {buttonText}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="link" onClick={() => router.push(switchModeLink)} className="text-sm">
              {switchModeText}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={showLoginErrorDialog} onOpenChange={setShowLoginErrorDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('loginFailedTitle')}</DialogTitle>
            <ModalDescription>
              {t('loginFailedDescription')}
            </ModalDescription>
          </DialogHeader>
          <ModalDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">{t('closeButton')}</Button>
            </DialogClose>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showRegistrationErrorDialog} onOpenChange={setShowRegistrationErrorDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('registrationFailedTitle')}</DialogTitle>
            <ModalDescription>
              {registrationErrorMessage || t('registrationFailedDescription')}
            </ModalDescription>
          </DialogHeader>
          <ModalDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">{t('closeButton')}</Button>
            </DialogClose>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showForgotPasswordDialog} onOpenChange={setShowForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MailQuestion /> {t('forgotPasswordTitle')}</DialogTitle>
            <ModalDescription>
            {t('forgotPasswordDesc')}
            </ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-input">{t('emailLabel')}</Label>
              <Input
                id="forgot-input"
                type="email"
                placeholder={t('forgotPasswordEmailPlaceholder')}
                value={forgotPasswordEmailInput}
                onChange={(e) => setForgotPasswordEmailInput(e.target.value)}
              />
            </div>
          </div>
          <ModalDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">{t('cancelButton')}</Button>
            </DialogClose>
            <Button type="button" onClick={handleForgotPasswordSubmit}>
              {t('forgotPasswordSendLink')}
            </Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
