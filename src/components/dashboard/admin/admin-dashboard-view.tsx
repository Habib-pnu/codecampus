
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { DashboardState, DashboardActions } from "../types";
import type { User, Institution } from "@/types";
import { Building, UserCog, ShieldCheck, KeyRound, Trash2, LineChart, Users, DollarSign } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLanguage } from "@/context/language-context";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { subDays, format } from "date-fns";

type AdminDashboardViewProps = Pick<DashboardState, "allUsers" | "classGroups" | "currentUser" | "institutions" | "transactions"> &
  Pick<DashboardActions, "handleUpdateUserRole" | "handleAdminResetPassword" | "handleToggleAdminStatus" | "handleAdminDeleteUser" | "handleAddInstitution" | "handleUpdateInstitution" | "handleDeleteInstitution" | "handleAssignInstitutionAdmin">;

export function AdminDashboardView({
  allUsers, classGroups, currentUser, institutions, transactions,
  handleUpdateUserRole, handleAdminResetPassword, handleToggleAdminStatus, handleAdminDeleteUser,
  handleAddInstitution, handleUpdateInstitution, handleDeleteInstitution, handleAssignInstitutionAdmin
}: AdminDashboardViewProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [userRoleChanges, setUserRoleChanges] = useState<Record<string, User['role']>>({});
  const [newInstitutionName, setNewInstitutionName] = useState("");
  const [newInstitutionPrice, setNewInstitutionPrice] = useState<number>(5);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [tempInstitutionName, setTempInstitutionName] = useState("");
  const [tempInstitutionPrice, setTempInstitutionPrice] = useState<number>(5);
  const [userToAssignAsInstAdmin, setUserToAssignAsInstAdmin] = useState("");

  const analyticsData = useMemo(() => {
    const today = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(today, i)).reverse();
    
    const userSignups = last30Days.map(day => ({
      date: format(day, "MMM dd"),
      count: allUsers.filter(u => u.createdAt && format(new Date(u.createdAt), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")).length,
    }));

    const activeClasses = classGroups.filter(c => c.status === 'active').length;
    const totalRevenue = transactions.filter(t => t.paid).reduce((sum, t) => sum + (t.finalAmountPaid ?? t.amount), 0);
    
    return { userSignups, activeClasses, totalRevenue, totalUsers: allUsers.length, totalInstitutions: institutions.length, totalClasses: classGroups.length };
  }, [allUsers, classGroups, transactions]);

  const handleRoleSelectionChange = (userId: string, newRoleValue: User['role']) => {
    setUserRoleChanges(prev => ({ ...prev, [userId]: newRoleValue }));
  };

  const submitUserRoleChange = (userId: string) => {
    const newRole = userRoleChanges[userId];
    if (newRole) {
      handleUpdateUserRole(userId, newRole);
      setUserRoleChanges(prev => {
        const newState = {...prev};
        delete newState[userId];
        return newState;
      });
    }
  };

  if (currentUser?.role !== 'global_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This panel is for global administrators only.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary" /> System Analytics
          </CardTitle>
          <CardDescription>High-level overview of platform activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Users" value={analyticsData.totalUsers} icon={<Users />} />
            <StatCard title="Active Classes" value={analyticsData.activeClasses} icon={<Users />} />
            <StatCard title="Total Institutions" value={analyticsData.totalInstitutions} icon={<Building />} />
            <StatCard title="Total Revenue" value={`฿${analyticsData.totalRevenue.toFixed(2)}`} icon={<DollarSign />} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New User Signups (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ users: { label: "Users", color: "hsl(var(--chart-1))" } }} className="h-[200px] w-full">
                <BarChart accessibilityLayer data={analyticsData.userSignups}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="count" fill="var(--color-users)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> User Management
          </CardTitle>
          <CardDescription>Manage roles and accounts for all users.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.username} | {user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(newRole) => handleRoleSelectionChange(user.id, newRole as User['role'])}
                        defaultValue={user.role}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {['normal', 'student', 'lecturer', 'institution_admin', 'global_admin'].map(role => (
                            <SelectItem key={role} value={role} className="capitalize">{role.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="secondary" onClick={() => submitUserRoleChange(user.id)} disabled={!userRoleChanges[user.id]}>Save Role</Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="outline"><KeyRound size={16} /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Reset Password?</AlertDialogTitle><AlertDialogDescription>Reset password for {user.fullName} to '1234'?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleAdminResetPassword(user.id)}>Confirm Reset</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TooltipTrigger>
                          <TooltipContent><p>Reset Password</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                           <TooltipTrigger asChild>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="destructive"><Trash2 size={16} /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete User?</AlertDialogTitle><AlertDialogDescription>Permanently delete {user.fullName} ({user.username})?</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleAdminDeleteUser(user.id)}>Confirm Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                           </TooltipTrigger>
                           <TooltipContent><p>Delete User</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}


function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  }
