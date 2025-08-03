import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";

const roles = [
  {
    name: "Owner",
    permissions: [
      { id: "dashboard", label: "View Dashboard" },
      { id: "sales", label: "Access Sales Terminal" },
      { id: "inventory", label: "Manage Inventory" },
      { id: "reports", label: "View Reports" },
      { id: "shifts", label: "Manage Shifts" },
      { id: "settings", label: "Edit Settings" },
      { id: "users", label: "Manage Users" },
      { id: "roles", label: "Manage Roles" },
    ],
  },
  {
    name: "Admin",
    permissions: [
      { id: "dashboard", label: "View Dashboard" },
      { id: "sales", label: "Access Sales Terminal" },
      { id: "inventory", label: "Manage Inventory" },
      { id: "reports", label: "View Reports" },
      { id: "shifts", label: "Manage Shifts" },
    ],
  },
  {
    name: "Cashier",
    permissions: [
      { id: "sales", label: "Access Sales Terminal" },
      { id: "shifts", label: "Start/End Own Shift" },
    ],
  },
];

const allPermissions = [
    { id: "dashboard", label: "View Dashboard" },
    { id: "sales", label: "Access Sales Terminal" },
    { id: "inventory", label: "Manage Inventory" },
    { id: "reports", label: "View Reports" },
    { id: "shifts", label: "Manage Shifts" },
    { id: "settings", label: "Edit Settings" },
    { id: "users", label: "Manage Users" },
    { id: "roles", label: "Manage Roles" },
];


export default function RolesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">Role Management</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
          <CardDescription>Define what each role can access and do within the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.name}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {allPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={`${role.name}-${permission.id}`} 
                              checked={role.permissions.some(p => p.id === permission.id)}
                            />
                            <Label htmlFor={`${role.name}-${permission.id}`} className="font-normal text-sm">{permission.label}</Label>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit Name</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete Role</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
          <Button>Save Changes</Button>
      </div>
    </div>
  );
}
