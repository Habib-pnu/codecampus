
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCog, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {username: string; no: string; studentId: string; fullName: string; email: string}) => Promise<boolean>;
  initialUsername: string;
  initialNo: string;
  initialStudentId: string;
  initialFullName: string;
  initialEmail: string;
  onInitiateDeleteAccount: () => void; 
}

export function EditProfileDialog({
  isOpen,
  onClose,
  onSubmit,
  initialUsername,
  initialNo,
  initialStudentId,
  initialFullName,
  initialEmail,
  onInitiateDeleteAccount, 
}: EditProfileDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [username, setUsername] = useState(initialUsername);
  const [no, setNo] = useState(initialNo);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUsername(initialUsername);
    setNo(initialNo);
    setStudentId(initialStudentId);
    setFullName(initialFullName);
    setEmail(initialEmail);
  }, [initialUsername, initialNo, initialStudentId, initialFullName, initialEmail, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !fullName.trim() || !email.trim()) {
      toast({ title: t('errorToast'), description: t('fillAllFieldsError'), variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: t('errorToast'), description: t('validEmailError'), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const success = await onSubmit({ 
        username: username.trim(), 
        no: no.trim() || "-", 
        studentId: studentId.trim() || "-", 
        fullName: fullName.trim(), 
        email: email.trim() 
    });
    setIsLoading(false);
    if (success) {
      onClose();
    }
  };

  const handleDialogClose = () => {
    setUsername(initialUsername);
    setNo(initialNo);
    setStudentId(initialStudentId);
    setFullName(initialFullName);
    setEmail(initialEmail);
    onClose();
  };

  const handleDeleteClick = () => {
    onClose(); 
    onInitiateDeleteAccount(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog /> {t('editProfileTitle')}</DialogTitle>
          <DialogDescription>
            {t('editProfileDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">{t('editProfileUsernameLabel')}</Label>
            <Input
              id="edit-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-no">{t('editProfileNoLabel')}</Label>
            <Input
              id="edit-no"
              type="text"
              value={no}
              onChange={(e) => setNo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-studentId">{t('editProfileStudentIdLabel')}</Label>
            <Input
              id="edit-studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-fullName">{t('editProfileFullNameLabel')}</Label>
            <Input
              id="edit-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t('editProfileEmailLabel')}</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <DialogFooter className="pt-4 sm:justify-between">
            <Button type="button" variant="destructive" onClick={handleDeleteClick} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('editProfileDeleteButton')}
            </Button>
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button type="button" variant="outline" onClick={handleDialogClose} className="w-full sm:w-auto">
                {t('cancelButton')}
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? t('editProfileUpdatingButton') : t('editProfileUpdateButton')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
