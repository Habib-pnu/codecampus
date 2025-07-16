
"use client";

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, UserPlus, Mail, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import type { User, ClassGroup, AdminSupportRequest, Lab } from '@/types';
import { format, isPast, isValid } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface NotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  notificationData: {
    classGroups: ClassGroup[];
    adminSupportRequests: AdminSupportRequest[];
    labs: Lab[];
  };
}

export function NotificationDialog({ isOpen, onClose, currentUser, notificationData }: NotificationDialogProps) {
  const { t, language } = useLanguage();
  const { classGroups, adminSupportRequests, labs } = notificationData;

  const notifications = React.useMemo(() => {
    const allNotifications: React.ReactNode[] = [];
    if (!currentUser) return [];

    // --- For Lecturers / Admins ---
    if (['lecturer', 'admin', 'institution_admin'].includes(currentUser.role)) {
      // Pending Join Requests
      classGroups.forEach(cg => {
        if (cg.adminId === currentUser.id || currentUser.isAdmin) {
          (cg.pendingJoinRequests || []).forEach(req => {
            allNotifications.push(
              <div key={`join-${req.userId}-${req.classId}`} className="flex items-start gap-3">
                <UserPlus className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <p className="font-semibold">{req.fullName} requests to join</p>
                  <p className="text-sm text-muted-foreground">Class: {cg.name}</p>
                </div>
              </div>
            );
          });
        }
      });

      // Pending Late Submission Requests
      classGroups.forEach(cg => {
         if (cg.adminId === currentUser.id || currentUser.isAdmin) {
             (cg.assignedChallenges || []).forEach(ac => {
                 Object.entries(ac.studentProgress).forEach(([studentId, progress]) => {
                     const student = allUsers.find(u => u.id === studentId);
                     if (!student) return;
                     Object.entries(progress).forEach(([targetCodeId, attempt]) => {
                        if (attempt.lateRequestStatus === 'requested') {
                             const lab = labs.find(l => l.id === ac.labId);
                             const challenge = lab?.challenges.find(c => c.id === ac.challengeId);
                             const targetCode = challenge?.targetCodes.find(tc => tc.id === targetCodeId);
                             allNotifications.push(
                                <div key={`late-${studentId}-${targetCodeId}`} className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
                                <div>
                                    <p className="font-semibold">{student.fullName} requests late submission</p>
                                    <p className="text-sm text-muted-foreground">{challenge?.title} - {targetCode?.description}</p>
                                </div>
                                </div>
                            );
                        }
                     });
                 });
             });
         }
      });
      
      // Unread Admin Support Messages
      adminSupportRequests.forEach(req => {
        const lastMessage = req.messages[req.messages.length - 1];
        if (req.status === 'open' && lastMessage && lastMessage.senderId !== currentUser.id) {
            allNotifications.push(
                <div key={`support-msg-${req.id}`} className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-purple-500 mt-1" />
                <div>
                    <p className="font-semibold">New message in support ticket</p>
                    <p className="text-sm text-muted-foreground">"{req.subject}"</p>
                </div>
                </div>
            );
        }
      });
    }

    // --- For All Roles (Assistance Chats) ---
    const assistanceChats = classGroups.flatMap(cg => (cg.assistanceRequests || []).map(req => ({ ...req, className: cg.name, classAdminId: cg.adminId })));

    assistanceChats.forEach(req => {
      const lastMessage = req.messages[req.messages.length - 1];
      const isMyRequest = req.studentId === currentUser.id;
      const amITheLecturer = req.classAdminId === currentUser.id || currentUser.isAdmin;

      if (req.status === 'open' && lastMessage && lastMessage.senderId !== currentUser.id) {
        if (isMyRequest || amITheLecturer) {
            allNotifications.push(
                <div key={`assist-msg-${req.id}`} className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-green-500 mt-1" />
                <div>
                    <p className="font-semibold">New message in assistance chat</p>
                    <p className="text-sm text-muted-foreground">{isMyRequest ? `From teacher in ${req.className}` : `From ${req.studentName} in ${req.className}`}</p>
                </div>
                </div>
            );
        }
      }
    });
    
    // This is just a placeholder because `allUsers` is not available here.
    // The logic to find the student is in the component that calls this.
    const allUsers = []; 

    return allNotifications;
  }, [currentUser, classGroups, adminSupportRequests, labs, t, language]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bell /> Notifications</DialogTitle>
          <DialogDescription>
            Here are your current pending items and unread messages.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <Card key={index} className="p-3">
                  {notification}
                </Card>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No new notifications. You're all caught up!
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
