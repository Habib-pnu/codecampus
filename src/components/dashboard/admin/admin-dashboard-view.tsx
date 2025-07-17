
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
import { Building, UserCog, ShieldCheck, KeyRound, Trash2, LineChart, Users, DollarSign, Merge } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLanguage } from "@/context/language-context";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { subDays, format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent as ModalDialogContent, DialogFooter as ModalDialogFooter, DialogHeader as ModalDialogHeader, DialogTitle as ModalDialogTitle, DialogDescription as ModalDialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

type AdminDashboardViewProps = Pick<DashboardState, "allUsers" | "classGroups" | "currentUser" | "institutions" | "transactions"> &
  Pick<DashboardActions, "handleUpdateUserRole" | "handleAdminResetPassword" | "handleToggleAdminStatus" | "handleAdminDeleteUser" | "handleAddInstitution" | "handleUpdateInstitution" | "handleDeleteInstitution" | "handleAssignInstitutionAdmin" | "setAllUsers" | "setInstitutions">;

export function AdminDashboardView({
  allUsers, classGroups, currentUser, institutions, transactions,
  handleUpdateUserRole, handleAdminResetPassword, handleToggleAdminStatus, handleAdminDeleteUser,
  handleAddInstitution, handleUpdateInstitution, handleDeleteInstitution, handleAssignInstitutionAdmin,
  setAllUsers, setInstitutions
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
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [targetMergeInstitution, setTargetMergeInstitution] = useState<string>("");
  const [sourceMergeInstitutions, setSourceMergeInstitutions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("analytics");

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
  
  const handleConfirmMerge = () => {
    if (!targetMergeInstitution || sourceMergeInstitutions.length === 0) {
      toast({ title: "Error", description: "Please select a target and at least one source institution to merge.", variant: "destructive" });
      return;
    }

    const sourceIds = new Set(sourceMergeInstitutions);
    
    // Update all users belonging to source institutions
    const updatedUsers = allUsers.map(user => {
        if (user.institutionId && sourceIds.has(user.institutionId)) {
            return { ...user, institutionId: targetMergeInstitution };
        }
        return user;
    });
    setAllUsers(updatedUsers);

    // Remove the source institutions from the list
    const updatedInstitutions = institutions.filter(inst => !sourceIds.has(inst.id));
    setInstitutions(updatedInstitutions);
    
    toast({ title: "Merge Successful", description: `Merged ${sourceMergeInstitutions.length} institution(s).` });
    setShowMergeDialog(false);
    setTargetMergeInstitution("");
    setSourceMergeInstitutions([]);
  };
  
  const usersToDisplay = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'global_admin') {
      return allUsers; 
    }
    if (currentUser.role === 'institution_admin') {
      return allUsers.filter(u => u.institutionId === currentUser.institutionId && u.role !== 'global_admin');
    }
    return [];
  }, [currentUser, allUsers]);

  if (currentUser?.role !== 'global_admin' && currentUser?.role !== 'institution_admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This panel is for administrators only.</p>
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
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 6)} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="count" fill="var(--color-users)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      
      {currentUser.role === 'global_admin' && (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2"><Building className="h-6 w-6 text-primary"/>Manage Institutions</CardTitle>
          <CardDescription>Add, edit, or remove institutions, set their student pricing, and manage institution admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleAddInstitution(newInstitutionName, newInstitutionPrice); setNewInstitutionName(''); setNewInstitutionPrice(5); }} className="flex flex-col sm:flex-row gap-4 mb-4 p-4 border rounded-lg">
            <div className="flex-grow">
              <Label htmlFor="new-inst-name">New Institution Name</Label>
              <Input id="new-inst-name" value={newInstitutionName} onChange={e => setNewInstitutionName(e.target.value)} required />
            </div>
            <div className="w-full sm:w-40">
              <Label htmlFor="new-inst-price">Price/Student (THB)</Label>
              <Input id="new-inst-price" type="number" value={newInstitutionPrice} onChange={e => setNewInstitutionPrice(Number(e.target.value))} required />
            </div>
            <div className="self-end flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowMergeDialog(true)}><Merge className="mr-2 h-4 w-4"/> Merge</Button>
              <Button type="submit">Add Institution</Button>
            </div>
          </form>
          <Accordion type="multiple" className="w-full space-y-2">
          {institutions.map(inst => (
            <AccordionItem value={inst.id} key={inst.id} className="border rounded-md px-2">
              <AccordionTrigger>
                <div>
                  <p className="font-semibold text-left">{inst.name}</p>
                  <p className="text-xs text-muted-foreground text-left">Price/Student: ฿{inst.pricePerStudent.toFixed(2)} | Admins: {(inst.adminUserIds || []).length}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow">
                      <Label>Name</Label>
                      <Input value={editingInstitution?.id === inst.id ? tempInstitutionName : inst.name} onChange={e => setTempInstitutionName(e.target.value)} onFocus={() => {if(editingInstitution?.id !== inst.id){setEditingInstitution(inst); setTempInstitutionName(inst.name); setTempInstitutionPrice(inst.pricePerStudent)}}} />
                    </div>
                    <div className="w-full sm:w-32">
                      <Label>Price</Label>
                      <Input type="number" value={editingInstitution?.id === inst.id ? tempInstitutionPrice : inst.pricePerStudent} onChange={e => setTempInstitutionPrice(Number(e.target.value))} onFocus={() => {if(editingInstitution?.id !== inst.id){setEditingInstitution(inst); setTempInstitutionName(inst.name); setTempInstitutionPrice(inst.pricePerStudent)}}} />
                    </div>
                    {editingInstitution?.id === inst.id && (
                      <div className="flex self-end gap-1">
                        <Button size="sm" onClick={() => { if(editingInstitution) handleUpdateInstitution({ ...editingInstitution, name: tempInstitutionName, pricePerStudent: tempInstitutionPrice }); setEditingInstitution(null); }}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingInstitution(null)}>Cancel</Button>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Institution Admins</h4>
                    <div className="space-y-2">
                      {(inst.adminUserIds || []).length > 0 ? inst.adminUserIds.map(adminId => {
                        const adminUser = allUsers.find(u => u.id === adminId);
                        return (
                          <div key={adminId} className="flex justify-between items-center p-1.5 bg-muted/50 rounded-md text-sm">
                            <span>{adminUser?.fullName || 'Unknown User'} ({adminUser?.username})</span>
                            <Button size="xs" variant="destructive_outline" onClick={() => handleAssignInstitutionAdmin(inst.id, adminId, false)}>Remove</Button>
                          </div>
                        )
                      }) : <p className="text-xs text-muted-foreground italic">No admins assigned.</p>}
                    </div>
                    <div className="mt-4 flex gap-2 items-end">
                      <div className="flex-grow">
                        <Label>Assign New Admin</Label>
                        <Select onValueChange={setUserToAssignAsInstAdmin}>
                          <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                          <SelectContent>
                            {allUsers
                              .filter(u => u.institutionId === inst.id && (u.role === 'lecturer' || u.role === 'institution_admin') && !(inst.adminUserIds || []).includes(u.id))
                              .map(user => <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.username})</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => userToAssignAsInstAdmin && handleAssignInstitutionAdmin(inst.id, userToAssignAsInstAdmin, true)} disabled={!userToAssignAsInstAdmin}>Assign</Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          </Accordion>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> User Management
          </CardTitle>
          <CardDescription>Manage roles and accounts for all users in your scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersToDisplay.map(user => {
                  const canEditUser = currentUser.role === 'global_admin' || (currentUser.role === 'institution_admin' && user.role !== 'global_admin');
                  const availableRoles = ['normal', 'student', 'lecturer', 'institution_admin'];
                  if(currentUser.role === 'global_admin') availableRoles.push('global_admin');

                  return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.username} | {user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(newRole) => handleRoleSelectionChange(user.id, newRole as User['role'])}
                        defaultValue={user.role}
                        disabled={!canEditUser}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map(role => (
                            <SelectItem key={role} value={role} className="capitalize">{role.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{institutions.find(i => i.id === user.institutionId)?.name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="secondary" onClick={() => submitUserRoleChange(user.id)} disabled={!userRoleChanges[user.id] || !canEditUser}>Save Role</Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="outline" disabled={!canEditUser}><KeyRound size={16} /></Button></AlertDialogTrigger>
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
                              <AlertDialogTrigger asChild><Button size="icon" variant="destructive" disabled={!canEditUser}><Trash2 size={16} /></Button></AlertDialogTrigger>
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
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <ModalDialogContent open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <ModalDialogHeader>
          <ModalDialogTitle>Merge Institutions</ModalDialogTitle>
          <ModalDialogDescription>Select a target institution and one or more source institutions to merge. All users from source institutions will be moved to the target.</ModalDialogDescription>
        </ModalDialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label>Target Institution (Keep this one)</Label>
            <Select value={targetMergeInstitution} onValueChange={setTargetMergeInstitution}>
              <SelectTrigger><SelectValue placeholder="Select target..." /></SelectTrigger>
              <SelectContent>
                {institutions.map(inst => (
                  <SelectItem key={inst.id} value={inst.id} disabled={sourceMergeInstitutions.includes(inst.id)}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source Institutions (These will be deleted)</Label>
            <ScrollArea className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
              {institutions.filter(inst => inst.id !== targetMergeInstitution).map(inst => (
                <div key={inst.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`merge-${inst.id}`}
                    checked={sourceMergeInstitutions.includes(inst.id)}
                    onCheckedChange={(checked) => {
                      setSourceMergeInstitutions(prev => checked ? [...prev, inst.id] : prev.filter(id => id !== inst.id));
                    }}
                  />
                  <Label htmlFor={`merge-${inst.id}`}>{inst.name}</Label>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
        <ModalDialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleConfirmMerge} disabled={!targetMergeInstitution || sourceMergeInstitutions.length === 0}>Merge Institutions</Button>
        </ModalDialogFooter>
      </ModalDialogContent>

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

