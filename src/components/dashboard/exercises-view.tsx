

"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardState, DashboardActions } from "./types";
import type { ClassGroup, Exercise, User, AssignedExerciseInfo, SupportedLanguage, LocalizedString } from "@/types";
import { ArrowLeft, CheckCircle, ListChecks, XCircle, Gem, Users, Clock, AlertTriangle, Languages, CodeXml, BrainCircuit, Globe, Info, Edit3, Trash2, PlusCircle } from "lucide-react";
import { AddExerciseForm } from "./add-exercise-form";
import { format, isPast, isValid } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "../ui/scroll-area";

type ExercisesViewProps = Pick<DashboardState, "exercises" | "currentExercise" | "isCompiling" | "currentUser" | "classGroups" | "allUsers"> &
  Pick<DashboardActions, "setCurrentExercise" | "handleSubmitExercise" | "setCode" | "setCodeTitle" | "handleAddExercise" | "handleUpdateExercise" | "handleDeleteExercise" | "setActiveTab" >;

interface GroupedExerciseViewItem extends Exercise {
  assignedClassId: string;
  assignedClassName: string;
  addedAt: string;
  expiryDate?: string;
  isExpired: boolean;
}

type LanguageCategory = 'cpp' | 'python' | 'web';

export function ExercisesView({
  exercises, currentExercise, setCurrentExercise,
  isCompiling, handleSubmitExercise,
  setCode, setCodeTitle, currentUser,
  handleAddExercise, handleUpdateExercise, handleDeleteExercise,
  classGroups, allUsers, setActiveTab
}: ExercisesViewProps) {
  const { t, language } = useLanguage();
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeCategory, setActiveCategory] = useState<LanguageCategory>('cpp');
  
  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en;
    }
    return '';
  };
  
  const handleSelectExercise = (exercise: Exercise) => {
    setCurrentExercise(exercise);

    const descriptionText = getLocalizedText(exercise.description);
    const commentStart = exercise.language === 'cpp' || exercise.language === 'javascript' || exercise.language === 'react' ? '/*\n' : (exercise.language === 'python' ? '"""\n' : '<!--\n');
    const commentEnd = exercise.language === 'cpp' || exercise.language === 'javascript' || exercise.language === 'react' ? '*/\n\n' : (exercise.language === 'python' ? '"""\n\n' : '-->\n\n');
    const descriptionComment = `${commentStart}Exercise: ${getLocalizedText(exercise.title)}\n\n${descriptionText}\n${commentEnd}`;

    setCode(`${descriptionComment}${exercise.startingCode}`);
    setCodeTitle(`${getLocalizedText(exercise.title)}.${exercise.language}`);
    setActiveTab("editor");
  };

  const getGroupedExercisesForStudent = (): { classId: string; className: string; exercises: GroupedExerciseViewItem[] }[] => {
    if (!currentUser || (currentUser.role !== 'student' && currentUser.role !== 'normal') || !currentUser.enrolledClassIds || currentUser.enrolledClassIds.length === 0) {
      return [];
    }

    const grouped: { classId: string; className: string; exercises: GroupedExerciseViewItem[] }[] = [];

    currentUser.enrolledClassIds.forEach(classId => {
      const classInfo = classGroups.find(cg => cg.id === classId);
      if (classInfo && !classInfo.isHalted && classInfo.status === 'active' && classInfo.assignedExercises) {
        const exercisesInThisClass: GroupedExerciseViewItem[] = classInfo.assignedExercises
          .map(assignedEx => {
            const exerciseDetail = exercises.find(ex => ex.id === assignedEx.exerciseId);
            if (!exerciseDetail) return null;
            return {
              ...exerciseDetail,
              assignedClassId: classInfo.id,
              assignedClassName: classInfo.name,
              addedAt: assignedEx.addedAt,
              expiryDate: assignedEx.expiryDate,
              isExpired: assignedEx.expiryDate ? isPast(new Date(assignedEx.expiryDate)) : false,
              language: exerciseDetail.language || 'cpp',
            };
          })
          .filter(ex => ex !== null) as GroupedExerciseViewItem[];

        if (exercisesInThisClass.length > 0) {
          grouped.push({ classId: classInfo.id, className: classInfo.name, exercises: exercisesInThisClass });
        }
      }
    });
    return grouped;
  };

  const studentGroupedExercises = getGroupedExercisesForStudent();

  const lecturerOwnedClasses = useMemo(() => {
    if (!currentUser || currentUser.role !== 'lecturer') return [];
    return classGroups.filter(cg => cg.adminId === currentUser.id);
  }, [currentUser, classGroups]);

  const languageCategories: Record<LanguageCategory, SupportedLanguage[]> = {
    'cpp': ['cpp'],
    'python': ['python'],
    'web': ['html', 'javascript', 'react'],
  };

  const viewableExercises = useMemo(() => {
    if (!currentUser || !allUsers) return [];

    return exercises.filter(ex => {
        if (ex.scope === 'global') return true;
        if (ex.creatorId === currentUser.id) return true;
        if (ex.scope === 'institutional') {
            const creator = allUsers.find(u => u.id === ex.creatorId);
            return creator?.institutionId === currentUser.institutionId;
        }
        return false;
    });
  }, [exercises, currentUser, allUsers]);

  const filteredExercises = useMemo(() => {
    return viewableExercises.filter(ex => languageCategories[activeCategory].includes(ex.language));
  }, [activeCategory, viewableExercises]);

  return (
    <div className="p-1 md:p-0 space-y-6">
      {(currentUser?.role === 'lecturer' || currentUser?.role === 'institution_admin' || currentUser?.isAdmin) && (
        <Card>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="add-exercise" className="border-b-0">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <CardTitle className="text-xl flex items-center gap-2"><PlusCircle className="h-6 w-6 text-primary" /> {t('addExerciseFormTitle')}</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <AddExerciseForm
                            mode="add"
                            onAddExercise={handleAddExercise}
                            onUpdateExercise={() => {}} // Not used in add mode
                            classGroupsForLecturer={lecturerOwnedClasses}
                            currentUser={currentUser}
                        />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
      )}

      <Dialog open={!!editingExercise} onOpenChange={(isOpen) => !isOpen && setEditingExercise(null)}>
        <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{t('editExerciseTitle')}</DialogTitle>
                <DialogDescription>{t('editExerciseDescription')}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4 -mr-2">
                <AddExerciseForm
                    mode="edit"
                    initialData={editingExercise}
                    onAddExercise={() => {}}
                    onUpdateExercise={(updatedExercise) => {
                        handleUpdateExercise(updatedExercise);
                        setEditingExercise(null);
                    }}
                    currentUser={currentUser}
                />
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><ListChecks className="h-6 w-6 text-primary" /> {t('codingExercisesTitle')}</CardTitle>
          <CardDescription>{t('codingExercisesDesc')}</CardDescription>
        </CardHeader>
      </Card>

      {(currentUser?.role === 'lecturer' || currentUser?.role === 'institution_admin' || currentUser?.isAdmin) && (
        <>
          {viewableExercises.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('noExercisesCreated')}</p>
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as LanguageCategory)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cpp">C++ ({viewableExercises.filter(e => e.language === 'cpp').length})</TabsTrigger>
                  <TabsTrigger value="python">Python ({viewableExercises.filter(e => e.language === 'python').length})</TabsTrigger>
                  <TabsTrigger value="web">Web ({viewableExercises.filter(e => ['html', 'javascript', 'react'].includes(e.language)).length})</TabsTrigger>
              </TabsList>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {filteredExercises.map((exercise) => (
                    <Card
                      key={exercise.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col relative"
                      onClick={() => handleSelectExercise(exercise)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleSelectExercise(exercise)}
                    >
                        <div className="flex absolute top-2 right-2 z-10">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingExercise(exercise); }}><Edit3 size={14} /></Button>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}><Trash2 size={14} /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertTitle>{t('deleteExerciseTitle')}</AlertTitle>
                                      <AlertDescription>{t('deleteExerciseDescription', { title: getLocalizedText(exercise.title) })}</AlertDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteExercise(exercise.id)}>{t('confirmDelete')}</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg pr-16">
                          {getLocalizedText(exercise.title)}
                        </CardTitle>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <Badge variant={
                            exercise.difficulty === 'beginner' ? 'default' :
                            exercise.difficulty === 'intermediate' ? 'secondary' :
                            'destructive'
                            } className="capitalize w-fit">{exercise.difficulty}</Badge>
                            <Badge variant="outline" className="ml-2 flex items-center gap-1">
                              <Languages size={12}/> {exercise.language.toUpperCase()}
                            </Badge>
                             <Badge variant="secondary" className="ml-2 flex items-center gap-1 capitalize">
                              {exercise.scope}
                            </Badge>
                            <span className="flex items-center text-primary font-semibold ml-auto">
                                <Gem className="mr-1 h-4 w-4" /> {exercise.points} {t('points')}
                            </span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground line-clamp-3">{getLocalizedText(exercise.description)}</p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
               {filteredExercises.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No materials found for this category.
                  </div>
                )}
            </Tabs>
          )}
        </>
      )}

      {(currentUser?.role === 'student' || (currentUser?.role === 'normal' && currentUser.enrolledClassIds && currentUser.enrolledClassIds.length > 0)) && (
        studentGroupedExercises.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('noAssignedExercises')}</p>
          </div>
        ) : (
          studentGroupedExercises.map((classGroupData) => (
            <div key={classGroupData.classId} className="mb-8">
              <Card className="mb-4 shadow-sm">
                <CardHeader className="p-4">
                  <CardTitle className="text-xl flex items-center gap-2"><Users className="h-5 w-5 text-primary/80" /> {classGroupData.className}</CardTitle>
                </CardHeader>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classGroupData.exercises.map((exerciseViewItem) => {
                  const isCompleted = currentUser.completedExercises.some(e => e.exerciseId === exerciseViewItem.id);
                  return (
                  <Card
                    key={exerciseViewItem.id + "_" + exerciseViewItem.assignedClassId}
                    className={cn(
                        "hover:shadow-lg transition-shadow cursor-pointer flex flex-col",
                        exerciseViewItem.isExpired && !isCompleted && "opacity-60"
                    )}
                    onClick={() => handleSelectExercise(exerciseViewItem)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectExercise(exerciseViewItem)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {getLocalizedText(exerciseViewItem.title)}
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                          ({(exerciseViewItem.language || 'cpp').toUpperCase()})
                        </span>
                      </CardTitle>
                       <div className="flex items-center justify-between text-sm mt-1">
                          <Badge variant={
                          exerciseViewItem.difficulty === 'beginner' ? 'default' :
                          exerciseViewItem.difficulty === 'intermediate' ? 'secondary' :
                          'destructive'
                          } className="capitalize w-fit">{exerciseViewItem.difficulty}</Badge>
                          <Badge variant="outline" className="ml-2 flex items-center gap-1">
                             <Languages size={12}/> {(exerciseViewItem.language || 'cpp').toUpperCase()}
                          </Badge>
                          <span className="flex items-center text-primary font-semibold ml-auto">
                              <Gem className="mr-1 h-4 w-4" /> {exerciseViewItem.points} {t('points')}
                          </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground line-clamp-3">{getLocalizedText(exerciseViewItem.description)}</p>
                       {exerciseViewItem.expiryDate && (
                            <p className={cn("text-xs mt-2 flex items-center", exerciseViewItem.isExpired && !isCompleted ? "text-destructive font-medium" : "text-muted-foreground")}>
                                <Clock className="mr-1 h-3 w-3"/>
                                {exerciseViewItem.isExpired && !isCompleted ? t('expiredOn') : t('expiresOn')}:{' '}
                                {isValid(new Date(exerciseViewItem.expiryDate)) ? format(new Date(exerciseViewItem.expiryDate), "PPp", { locale: language === 'th' ? th : enUS }) : 'N/A'}
                            </p>
                        )}
                    </CardContent>
                    <CardFooter>
                      <Button variant="link" className="p-0 h-auto text-primary text-sm">{t('viewExercise')} &rarr;</Button>
                      {isCompleted && (
                          <CheckCircle className="ml-auto h-5 w-5 text-green-500" />
                      )}
                       {exerciseViewItem.isExpired && !isCompleted && (
                          <AlertTriangle className="ml-auto h-5 w-5 text-destructive" />
                      )}
                    </CardFooter>
                  </Card>
                )})}
              </div>
            </div>
          ))
        )
      )}

      {currentUser?.role === 'normal' && (!currentUser.enrolledClassIds || currentUser.enrolledClassIds.length === 0) && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('joinClassPromptExercises')}</p>
          <Button className="mt-2 text-sm" onClick={() => setActiveTab("my-classes")} variant="outline">{t('goToMyClasses')}</Button>
        </div>
      )}
    </div>
  );
}
