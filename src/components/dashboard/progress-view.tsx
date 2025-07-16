

"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart3, CheckSquare, Zap, Trophy, Gem, Users, BookOpenText, User, Star, ListTree, Download, Eye, UserCheck, X, Copy } from "lucide-react";
import { LineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, Line, ResponsiveContainer } from 'recharts';
import type { DashboardState, DashboardActions } from "./types";
import type { User as UserType, Exercise, ClassGroup, Lab, AssignedChallengeInfo, StudentLabAttempt, LocalizedString, LabChallenge } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { subWeeks, format as formatDate, startOfWeek, endOfWeek, isWithinInterval, startOfToday, differenceInWeeks, differenceInDays } from 'date-fns';
import { useLanguage } from "@/context/language-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { SkillAssessmentView } from "./skill-assessment-view";


type ProgressViewProps = Pick<DashboardState, "userProgress" | "currentUser" | "exercises" | "allUsers" | "classGroups" | "labs" > &
  Pick<DashboardActions, "handleApproveJoinRequest" | "handleDenyJoinRequest">;

const StudentSubmissionsDialog = React.memo(function StudentSubmissionsDialog({ isOpen, onClose, student, classGroup, labs }: StudentSubmissionsDialogProps) {
  const { t, language } = useLanguage();

  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) return text[language] || text.en || '';
    return '';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('submissionDetails')} for {student.fullName}</DialogTitle>
          <DialogDescription>Viewing all lab submissions for class: {classGroup.name}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-2">
            {(classGroup.assignedChallenges || []).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No labs have been assigned to this class.</p>
            ) : (
            <Accordion type="multiple" className="w-full space-y-4">
                {(classGroup.assignedChallenges || []).map(assignedChallenge => {
                    const lab = labs.find(l => l.id === assignedChallenge.labId);
                    const challenge = lab?.challenges.find(c => c.id === assignedChallenge.challengeId);
                    const studentProgress = assignedChallenge.studentProgress[student.id];

                    if (!lab || !challenge) return null;

                    return (
                        <AccordionItem value={assignedChallenge.assignmentId} key={assignedChallenge.assignmentId}>
                            <AccordionTrigger className="font-semibold text-base p-3 bg-muted/50 rounded-md">
                               {getLocalizedText(lab.title)}: {getLocalizedText(challenge.title)}
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-3">
                                {!studentProgress ? (
                                    <p className="text-muted-foreground italic text-sm text-center py-4">No submissions from this student for this week.</p>
                                ) : (
                                    Object.entries(studentProgress).map(([targetCodeId, attempt]) => {
                                        const targetCode = challenge.targetCodes.find(tc => tc.id === targetCodeId);
                                        if (!targetCode) return null;

                                        return (
                                            <Card key={targetCodeId}>
                                                <CardHeader>
                                                    <CardTitle className="text-md">{getLocalizedText(targetCode.description)}</CardTitle>
                                                    <CardDescription>
                                                        Score: {(attempt.score || 0).toFixed(2)} / {attempt.lateSubmissionMaxScore ?? targetCode.points}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div className="flex flex-col gap-4">
                                                    <Card>
                                                      <CardHeader className="pb-2">
                                                        <CardTitle className="text-base">Submitted Code</CardTitle>
                                                      </CardHeader>
                                                      <CardContent>
                                                        <div className="h-64 border rounded-md overflow-hidden">
                                                          <Editor
                                                            height="100%"
                                                            language={attempt.language}
                                                            theme="vs-dark"
                                                            value={attempt.studentCode}
                                                            options={{ readOnly: true, fontSize: 12, minimap: { enabled: false } }}
                                                          />
                                                        </div>
                                                      </CardContent>
                                                    </Card>
                                                  </div>
                                                  <div className="flex flex-col gap-4">
                                                    <SkillAssessmentView assessment={attempt.assessment} />
                                                  </div>
                                                </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
});


export function ProgressView({
    currentUser,
    exercises,
    allUsers,
    classGroups,
    labs,
    handleApproveJoinRequest,
    handleDenyJoinRequest,
}: ProgressViewProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [viewingStudent, setViewingStudent] = React.useState<{student: UserType, classGroup: ClassGroup} | null>(null);
  
  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en || '';
    }
    return '';
  };

  const chartConfig = {
    exercises: { label: "Exercises Completed", color: "hsl(var(--chart-1))" },
    problems: { label: "Problems Solved", color: "hsl(var(--chart-2))" },
  };

 const realChartData = React.useMemo(() => {
    if (!currentUser) return [];

    const enrolledClasses = classGroups.filter(cg => currentUser.enrolledClassIds.includes(cg.id) && cg.startedAt && cg.status === 'active');
    if (enrolledClasses.length === 0) return [];

    const firstStartDate = new Date(Math.min(...enrolledClasses.map(cg => new Date(cg.startedAt!).getTime())));
    const today = startOfToday();
    const totalWeeks = Math.max(differenceInWeeks(today, firstStartDate, { weekStartsOn: 1 }), 0);

    const weeklyData: { [week: string]: { exercises: number, problems: number } } = {};

    for (let i = totalWeeks; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
        const weekLabel = formatDate(weekStart, 'MMM d');
        weeklyData[weekLabel] = { exercises: 0, problems: 0 };
    }

    // Process completed exercises
    (currentUser.completedExercises || []).forEach(comp => {
        const completionDate = new Date(comp.completedAt);
        const weekStart = startOfWeek(completionDate, { weekStartsOn: 1 });
        const weekLabel = formatDate(weekStart, 'MMM d');
        if (weeklyData[weekLabel]) {
            weeklyData[weekLabel].exercises++;
        }
    });

    // Process completed lab problems
    const enrolledClassIds = new Set(currentUser.enrolledClassIds);
    classGroups.forEach(cg => {
        if (enrolledClassIds.has(cg.id)) {
            (cg.assignedChallenges || []).forEach(ac => {
                const studentProgress = ac.studentProgress?.[currentUser.id];
                if (studentProgress) {
                    Object.values(studentProgress).forEach(attempt => {
                        if (attempt.completed) {
                            const completionDate = new Date(attempt.lastCheckedAt);
                            const weekStart = startOfWeek(completionDate, { weekStartsOn: 1 });
                            const weekLabel = formatDate(weekStart, 'MMM d');
                            if (weeklyData[weekLabel]) {
                                weeklyData[weekLabel].problems++;
                            }
                        }
                    });
                }
            });
        }
    });

    return Object.entries(weeklyData).map(([weekName, counts]) => ({
        name: weekName,
        exercises: counts.exercises,
        problems: counts.problems
    }));
}, [currentUser, classGroups]);


  const studentStats = React.useMemo(() => {
    if (!currentUser || !classGroups) {
        return { totalAssigned: 0, completedAssigned: 0, percentage: 0, streak: 0, totalLabScore: 0 };
    }

    // Lab Score Calculation
    let totalLabScore = 0;
    const enrolledClassIds = new Set(currentUser.enrolledClassIds);
    classGroups.forEach(cg => {
        if (enrolledClassIds.has(cg.id)) {
            (cg.assignedChallenges || []).forEach(ac => {
                const studentProgress = ac.studentProgress?.[currentUser.id];
                if (studentProgress) {
                    Object.values(studentProgress).forEach(attempt => {
                        totalLabScore += attempt.score || 0;
                    });
                }
            });
        }
    });

    // "Materials Completed" Calculation
    const assignedExerciseIds = new Set<number>();
    currentUser.enrolledClassIds.forEach(classId => {
        const classInfo = classGroups.find(cg => cg.id === classId);
        if (classInfo && classInfo.assignedExercises) {
            classInfo.assignedExercises.forEach(ae => assignedExerciseIds.add(ae.exerciseId));
        }
    });
    const totalAssigned = assignedExerciseIds.size;
    const completedAssigned = (currentUser.completedExercises || [])
        .filter(ce => assignedExerciseIds.has(ce.exerciseId)).length;
    const percentage = totalAssigned > 0 ? Math.round((completedAssigned / totalAssigned) * 100) : 0;
    
    // Streak Calculation
    const firstActiveClass = classGroups
      .filter(cg => currentUser.enrolledClassIds.includes(cg.id) && cg.status === 'active' && cg.startedAt)
      .sort((a, b) => new Date(a.startedAt!).getTime() - new Date(b.startedAt!).getTime())[0];
      
    const streak = firstActiveClass ? differenceInDays(new Date(), new Date(firstActiveClass.startedAt!)) : 0;

    return { totalAssigned, completedAssigned, percentage, streak, totalLabScore };
  }, [currentUser, classGroups]);


  const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
    const link = document.createElement("a");
    if (link.download !== undefined) { 
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportClassToCSV = (classGroup: ClassGroup) => {
    if (!currentUser || (currentUser.role !== 'lecturer' && !currentUser.isAdmin && currentUser.role !== 'institution_admin') || !allUsers || !labs || !classGroup.assignedChallenges) {
      toast({ title: t('exportError'), description: t('exportError'), variant: "destructive" });
      return;
    }

    const studentsInClass = (classGroup.members || [])
      .map(member => allUsers.find(u => u.id === member.userId))
      .filter(Boolean) as UserType[];

    if (studentsInClass.length === 0) {
      toast({ title: "Info", description: `No students in class "${classGroup.name}" to export.`, variant: "default" });
      return;
    }
    
    const labChallengeHeaders: string[] = [];
    (classGroup.assignedChallenges || []).forEach(ac => {
      const labTemplate = labs.find(l => l.id === ac.labId);
      const challengeDetails = labTemplate?.challenges.find(c => c.id === ac.challengeId);
      if (labTemplate && challengeDetails) {
        labChallengeHeaders.push(`"${getLocalizedText(challengeDetails.title)} Score"`);
      }
    });

    const headers = ["Alias", "Username", "No.", "SID", "Learn Score", ...labChallengeHeaders];
    const csvRows = [headers.join(",")];

    studentsInClass.forEach(student => {
      const studentMemberInfo = (classGroup.members || []).find(m => m.userId === student.id);
      
      const learnScoreForClass = (student.completedExercises || [])
        .filter(ce => (classGroup.assignedExercises || []).some(ae => ae.exerciseId === ce.exerciseId))
        .reduce((sum, ce) => sum + (exercises.find(e => e.id === ce.exerciseId)?.points || 0), 0);

      const row: (string | number)[] = [
        `"${studentMemberInfo?.alias || student.username}"`,
        `"${student.username}"`,
        `"${student.no}"`,
        `"${student.studentId}"`,
        learnScoreForClass.toFixed(2),
      ];

      (classGroup.assignedChallenges || []).forEach(assignedChallenge => {
        const studentProgressForChallenge = assignedChallenge.studentProgress?.[student.id];
        let totalScore = 0;
        
        if (studentProgressForChallenge) {
          Object.values(studentProgressForChallenge).forEach(attempt => {
            totalScore += attempt.score || 0;
          });
        }
        
        row.push(totalScore.toFixed(2));
      });
      csvRows.push(row.map(String).join(","));
    });

    const csvString = csvRows.join("\n");
    const filename = `${classGroup.name.replace(/[^a-z0-9]/gi, '_')}_progress.csv`;
    downloadCSV(csvString, filename);
    toast({ title: t('exportSuccessTitle'), description: t('exportSuccessDesc', { class: classGroup.name, file: filename }) });
  };
  
  const handleCopyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({title: t('copiedTitle'), description: t('classCodeCopied')});
  }


  return (
    <div className="p-1 md:p-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {currentUser?.role === 'lecturer' || currentUser?.isAdmin || currentUser?.role === 'institution_admin' ? t('tabLecturerProgress') : t('yourProgressTitle')}
          </CardTitle>
          <CardDescription>
            {currentUser?.role === 'lecturer' || currentUser?.isAdmin || currentUser?.role === 'institution_admin'
                ? t('perClassSummaryDesc')
                : t('studentProgressDesc', { studentName: currentUser?.username || "User" })
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Student View */}
      {currentUser?.role !== 'lecturer' && !currentUser?.isAdmin && currentUser?.role !== 'institution_admin' && (
        <>
            <Card>
                <CardHeader>
                <CardTitle className="text-lg">{t('weeklyActivity')}</CardTitle>
                <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                <ChartContainer config={chartConfig} className="aspect-video h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={realChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <RechartsLegend
                        formatter={(value, entry) => (
                            <span style={{ color: 'hsl(var(--foreground))' }}>
                            {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label || value}
                            </span>
                        )}
                        />
                        <Line type="monotone" dataKey="exercises" stroke="var(--color-exercises)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-exercises)" }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="problems" stroke="var(--color-problems)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-problems)" }} activeDot={{ r: 6 }} />
                    </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                <CardTitle className="text-lg">{t('overallStats')}</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                      title={t('totalLabScore')}
                      value={`${studentStats.totalLabScore.toFixed(2)} ${t('points')}`}
                      icon={<ListTree className="h-6 w-6 text-indigo-500" />}
                      description={t('totalLabScoreDesc')}
                    />
                    <StatCard
                      title={t('exercisesCompleted')}
                      value={`${studentStats.completedAssigned} / ${studentStats.totalAssigned} (${studentStats.percentage}%)`}
                      icon={<CheckSquare className="h-6 w-6 text-primary" />}
                      description={"Number of provided only materials you have finished."}
                    />
                    <StatCard
                      title={t('currentStreak')}
                      value={`${studentStats.streak} ${t('days')}`}
                      icon={<Zap className="h-6 w-6 text-yellow-500" />}
                      description={"Consecutive days of activity since your first class started."}
                    />
                </div>
                </CardContent>
            </Card>
        </>
      )}

      {/* Lecturer/Admin View */}
      {(currentUser?.role === 'lecturer' || currentUser?.isAdmin || currentUser?.role === 'institution_admin') && (() => {
          const administeredClasses = classGroups.filter(cg => currentUser.isAdmin || cg.adminId === currentUser.id || (currentUser.role === 'institution_admin' && cg.institutionId === currentUser.institutionId));
          return (
             administeredClasses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">{t('noClassesWithStudents')}</p>
              ) : (
                <div className="space-y-6">
                  {administeredClasses.map(classGroup => {
                    if (!classGroup) return null;

                    const classStudents = (classGroup.members || [])
                      .filter(m => m.status === 'active')
                      .map(m => allUsers.find(u => u.id === m.userId))
                      .filter(Boolean) as UserType[];
                    
                    const totalPossibleLearnScore = (classGroup.assignedExercises || []).reduce((sum, as) => sum + (exercises.find(e => e.id === as.exerciseId)?.points || 0), 0);

                    return (
                      <Card key={classGroup.id} className="bg-muted/30">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                             <div className="flex items-center gap-2">
                                <CardTitle className="text-md text-primary">{classGroup.name}</CardTitle>
                                <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                        Code: <strong className="ml-1 select-all">{classGroup.classCode}</strong>
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopyClassCode(classGroup.classCode)}><Copy size={12}/></Button>
                                </div>
                             </div>
                            <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExportClassToCSV(classGroup)}
                                  className="ml-auto text-xs"
                                >
                                  <Download className="mr-1 h-3 w-3" /> {t('exportToCsv')}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3 space-y-4">
                          {classStudents.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Learn Score</TableHead>
                                        <TableHead>Lab Progress</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classStudents.map(student => {
                                        const learnScoreForClass = (student.completedExercises || [])
                                          .filter(ce => (classGroup.assignedExercises || []).some(ae => ae.exerciseId === ce.exerciseId))
                                          .reduce((sum, ce) => sum + (exercises.find(e => e.id === ce.exerciseId)?.points || 0), 0);

                                        return (
                                          <TableRow key={student.id}>
                                            <TableCell className="font-medium">
                                                {classGroup.members.find(m => m.userId === student.id)?.alias || student.fullName}
                                            </TableCell>
                                            <TableCell>{learnScoreForClass.toFixed(2)} / {totalPossibleLearnScore} pts</TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm" onClick={() => setViewingStudent({student, classGroup})}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Submissions
                                                </Button>
                                            </TableCell>
                                          </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">{t('noStudentsEnrolledYet')}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
          );
      })()}
      
      {viewingStudent && (
        <StudentSubmissionsDialog 
            isOpen={!!viewingStudent}
            onClose={() => setViewingStudent(null)}
            student={viewingStudent.student}
            classGroup={viewingStudent.classGroup}
            labs={labs}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="flex flex-col justify-between p-4 bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </Card>
  );
}

interface StudentSubmissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserType;
  classGroup: ClassGroup;
  labs: Lab[];
}

