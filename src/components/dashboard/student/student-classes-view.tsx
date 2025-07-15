
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User, ClassGroup, Exercise, Lab, LabAssignment, LocalizedString, ProblemAssistantRequest } from "@/types";
import { LogInIcon, Hourglass, CheckCircle, XCircle, BookOpen, Users, ListTree, Banknote, MessageSquare, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, isValid } from "date-fns";
import { th, enUS } from "date-fns/locale";
import type { DashboardState, DashboardActions } from '../types';
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


interface StudentClassesViewProps extends Pick<DashboardState, 'currentUser' | 'classGroups' | 'exercises' | 'labs' | 'labAssignments'>,
  Pick<DashboardActions, 'handleLeaveClass' | 'handleCreateAssistanceRequest' | 'handleSendAssistanceMessage' | 'handleCloseAssistanceRequest' | 'handleSendPublicChatMessage'> {
    onRequestToJoinClass: () => void;
}

export function StudentClassesView({
  currentUser, classGroups, exercises, labs, labAssignments,
  onRequestToJoinClass, handleLeaveClass,
  handleCreateAssistanceRequest, handleSendAssistanceMessage, handleCloseAssistanceRequest, handleSendPublicChatMessage
}: StudentClassesViewProps) {
  const { t, language } = useLanguage();
  const [publicChatMessage, setPublicChatMessage] = React.useState<Record<string, string>>({});
  const [privateChatMessage, setPrivateChatMessage] = React.useState<Record<string, string>>({});
  
  const getClassName = (classId: string) => {
    return classGroups.find(cg => cg.id === classId)?.name || "Unknown Class";
  }

  const getLecturerUsername = (adminId: string | undefined) => {
    if (!adminId) return "N/A";
    return "Lecturer"; // Placeholder
  }

  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en;
    }
    return '';
  };
  
  const handleSendPrivateMessage = (classId: string) => {
    const message = privateChatMessage[classId]?.trim();
    if (!message || !currentUser) return;
    
    const request = classGroups.find(cg => cg.id === classId)?.assistanceRequests?.find(req => req.studentId === currentUser.id);

    if (request) { // Existing request
      handleSendAssistanceMessage(classId, request.id, message);
    } else { // First message
      handleCreateAssistanceRequest(classId, message);
    }

    setPrivateChatMessage(prev => ({...prev, [classId]: ''}));
  };

  const visibleClassGroups = classGroups.filter(cg => !cg.isHalted);

  return (
    <>
      <div className="space-y-6 p-1 md:p-0">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> {t('myClassroomsTitle')}
            </CardTitle>
            <CardDescription>{t('myClassroomsDesc')}</CardDescription>
          </CardHeader>
          {(currentUser && (currentUser.role === 'normal' || currentUser.role === 'student')) && (
              <CardContent>
                   <Button onClick={() => onRequestToJoinClass()} className="w-full sm:w-auto">
                      <LogInIcon className="mr-2 h-4 w-4"/> {t('joinNewClass')}
                  </Button>
              </CardContent>
          )}
        </Card>

        {currentUser.pendingClassRequests && currentUser.pendingClassRequests.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hourglass className="h-5 w-5 text-amber-500" /> {t('pendingJoinRequests')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-48">
                <ul className="space-y-2">
                  {currentUser.pendingClassRequests.map(req => (
                    <li key={req.classId} className="p-3 border rounded-md flex justify-between items-center bg-muted/30">
                      <div>
                        <span className="font-medium">{req.className || getClassName(req.classId)}</span>
                        <p className="text-xs text-muted-foreground">{t('requestedOn')} {isValid(new Date(req.requestedAt)) ? format(new Date(req.requestedAt), "PPp", { locale: language === 'th' ? th : enUS }) : 'N/A'}</p>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {currentUser.enrolledClassIds && currentUser.enrolledClassIds.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" /> {t('enrolledClasses')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[60vh]">
                <ul className="space-y-3">
                  {currentUser.enrolledClassIds.map(classId => {
                    const enrolledClass = visibleClassGroups.find(cg => cg.id === classId);
                    if (!enrolledClass) return null;

                    const memberInfo = enrolledClass.members.find(m => m.userId === currentUser.id);
                    
                    const openPrivateRequest = enrolledClass.assistanceRequests?.find(req => req.studentId === currentUser.id && req.status === 'open');

                    return (
                      <li key={classId} className="p-3 border rounded-md hover:bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-primary text-lg">{enrolledClass.name}</h4>
                            <Badge variant={enrolledClass.status === 'active' ? 'default' : enrolledClass.status === 'finished' ? 'secondary' : 'outline'} className="capitalize text-xs my-1">
                              Status: {enrolledClass.status}
                            </Badge>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive_outline" size="sm" disabled={enrolledClass.status === 'finished'}>
                                  <XCircle className="mr-1 h-4 w-4" /> {t('leaveClass')}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('leaveClassConfirmTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('leaveClassConfirmDesc', { className: enrolledClass.name })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleLeaveClass(classId)} className="bg-destructive hover:bg-destructive/90">
                                    {t('confirmLeave')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        
                        <Tabs defaultValue="public-chat" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="public-chat">Public Chat</TabsTrigger>
                            <TabsTrigger value="private-chat">Private Chat with Teacher</TabsTrigger>
                          </TabsList>
                          <TabsContent value="public-chat" className="mt-2">
                             <div className="space-y-2">
                                <ScrollArea className="h-40 w-full rounded-md border p-2">
                                    {(enrolledClass.publicChatMessages || []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center italic">No public messages yet.</p>
                                    ) : (
                                        (enrolledClass.publicChatMessages || []).map(msg => (
                                            <div key={msg.id} className={cn("mb-2 flex", msg.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                                <div className="flex flex-col max-w-[80%]">
                                                    <span className={cn("text-[10px] text-muted-foreground px-1", msg.senderId === currentUser.id ? "text-right" : "text-left")}>{msg.senderName}</span>
                                                    <div className={cn("rounded-lg px-3 py-2 text-sm", msg.senderId === currentUser.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </ScrollArea>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder="Type a public message..."
                                        value={publicChatMessage[classId] || ''}
                                        onChange={(e) => setPublicChatMessage(p => ({...p, [classId]: e.target.value}))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && publicChatMessage[classId]?.trim()) {
                                                handleSendPublicChatMessage(classId, publicChatMessage[classId]!.trim());
                                                setPublicChatMessage(p => ({...p, [classId]: ''}));
                                            }
                                        }}/>
                                    <Button onClick={() => {
                                        if (publicChatMessage[classId]?.trim()) {
                                            handleSendPublicChatMessage(classId, publicChatMessage[classId]!.trim());
                                            setPublicChatMessage(p => ({...p, [classId]: ''}));
                                        }
                                    }} disabled={!publicChatMessage[classId]?.trim()}><Send size={16}/></Button>
                                </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="private-chat" className="mt-2">
                             <div className="space-y-2">
                                <ScrollArea className="h-40 w-full rounded-md border p-2">
                                  {(openPrivateRequest?.messages || []).length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center italic">Send a message to start a private chat with your teacher.</p>
                                  ) : (
                                      (openPrivateRequest.messages || []).map(msg => (
                                          <div key={msg.id} className={cn("mb-2 flex", msg.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                                <div className="flex flex-col max-w-[80%]">
                                                    <div className={cn("rounded-lg px-3 py-2 text-sm", msg.senderId === currentUser.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                          </div>
                                      ))
                                  )}
                                </ScrollArea>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder="Type a private message..."
                                        value={privateChatMessage[classId] || ''}
                                        onChange={(e) => setPrivateChatMessage(p => ({...p, [classId]: e.target.value}))}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleSendPrivateMessage(classId);
                                            }
                                        }}/>
                                    <Button onClick={() => handleSendPrivateMessage(classId)} disabled={!privateChatMessage[classId]?.trim()}><Send size={16}/></Button>
                                </div>
                                {openPrivateRequest && (
                                  <Button variant="outline" size="sm" onClick={() => handleCloseAssistanceRequest(classId, openPrivateRequest.id)}>End Chat Session</Button>
                                )}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {currentUser.role === 'student' && (!currentUser.enrolledClassIds || currentUser.enrolledClassIds.length === 0) && (
           <Card className="shadow-md">
              <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground mb-2">{t('notEnrolled')}</p>
                  <Button onClick={() => onRequestToJoinClass()}>
                      <LogInIcon className="mr-2 h-4 w-4"/> {t('joinAClass')}
                  </Button>
              </CardContent>
           </Card>
        )}
      </div>
    </>
  );
}
