"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/data-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useBranches } from "@/hooks/use-branches";
import { useOrganization, useUpdateOrganization, useCreateBranch } from "@/hooks/use-org";
import { useUsers, useRoles, useCreateUser } from "@/hooks/use-users";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Organization profile, branches, and team members." />
      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="users">Team</TabsTrigger>
        </TabsList>
        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrganizationTab() {
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [form, setForm] = React.useState<Partial<{ name: string; address: string; phone: string; email: string }>>({});

  React.useEffect(() => {
    if (org) setForm({ name: org.name, address: org.address ?? "", phone: org.phone ?? "", email: org.email ?? "" });
  }, [org]);

  if (isLoading) return <LoadingState rows={4} />;
  if (!org) return null;

  async function handleSave() {
    try {
      await updateOrg.mutateAsync(form);
      toast.success("Organization updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update organization");
    }
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Organization profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm text-muted-foreground">
          <span>Default VAT rate</span>
          <Badge variant="secondary">{org.defaultVatRate}%</Badge>
        </div>
        <Button onClick={handleSave} disabled={updateOrg.isPending}>
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function BranchesTab() {
  const { data: branches, isLoading } = useBranches();
  const createBranch = useCreateBranch();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");

  async function handleSubmit() {
    if (!name || !code) return toast.error("Name and code are required");
    try {
      await createBranch.mutateAsync({ name, code });
      toast.success("Branch created");
      setOpen(false);
      setName("");
      setCode("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create branch");
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> New branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. BKT01" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createBranch.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading && <LoadingState />}
      {branches && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="font-mono text-xs">{b.code}</TableCell>
                <TableCell>
                  <Badge variant={b.isActive ? "success" : "secondary"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function UsersTab() {
  const { data: users, isLoading } = useUsers();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <NewUserDialog />
      </div>
      {isLoading && <LoadingState />}
      {users && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Branches</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r.role.id} variant="outline">
                        {r.role.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.branches.map((b) => b.branch.name).join(", ") || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function NewUserDialog() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [roleIds, setRoleIds] = React.useState<string[]>([]);
  const [branchIds, setBranchIds] = React.useState<string[]>([]);
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();
  const createUser = useCreateUser();

  async function handleSubmit() {
    if (!email || !password || !fullName || roleIds.length === 0) {
      toast.error("Fill in all fields and select at least one role");
      return;
    }
    try {
      await createUser.mutateAsync({ email, password, fullName, roleIds, branchIds });
      toast.success("Team member added");
      setOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setRoleIds([]);
      setBranchIds([]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add team member");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Invite team member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Temporary password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Roles</Label>
            <div className="space-y-1.5 rounded-md border border-border p-2">
              {roles?.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roleIds.includes(role.id)}
                    onCheckedChange={(checked) =>
                      setRoleIds((prev) => (checked ? [...prev, role.id] : prev.filter((id) => id !== role.id)))
                    }
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Branches</Label>
            <div className="space-y-1.5 rounded-md border border-border p-2">
              {branches?.map((branch) => (
                <label key={branch.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={branchIds.includes(branch.id)}
                    onCheckedChange={(checked) =>
                      setBranchIds((prev) => (checked ? [...prev, branch.id] : prev.filter((id) => id !== branch.id)))
                    }
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createUser.isPending}>
            {createUser.isPending ? "Adding…" : "Add team member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
