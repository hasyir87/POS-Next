import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";

const allPermissions = [
    // Dashboard / Reporting Permissions
    { id: "dashboard.view", label: "View Dashboard", category: "Dashboard" },
    { id: "reports.view", label: "View Reports", category: "Reports" },
    { id: "reports.export", label: "Export Reports", category: "Reports" },
    
    // Transaction / Sales Permissions
    { id: "transactions.create", label: "Create Transactions", category: "Sales" },
    { id: "transactions.view", label: "View Transactions", category: "Sales" },

    // Inventory Permissions
    { id: "inventory.view", label: "View Inventory", category: "Inventory" },
    { id: "inventory.manage", label: "Manage Inventory", category: "Inventory" },
    { id: "inventory.ai", label: "Use AI Mixologist", category: "Inventory" },

    // Staff & Shift Management
    { id: "shifts.manage", label: "Manage All Shifts", category: "Shifts" },
    { id: "shifts.own.manage", label: "Manage Own Shift", category: "Shifts" },

    // Settings & User Management
    { id: "users.manage", label: "Manage Users", category: "Settings" },
    { id: "roles.manage", label: "Manage Roles", category: "Settings" },
    { id: "settings.manage", label: "Manage App Settings", category: "Settings" },
];


const roles = [
  {
    name: "Owner",
    description: "Has all permissions by default.",
    permissions: allPermissions.map(p => p.id),
  },
  {
    name: "Admin",
    description: "Manages day-to-day operations.",
    permissions: [
      "dashboard.view",
      "reports.view",
      "reports.export",
      "transactions.view",
      "inventory.view",
      "inventory.manage",
      "inventory.ai",
      "shifts.manage",
      "users.manage",
    ],
  },
  {
    name: "Cashier",
    description: "Handles sales transactions via POS.",
    permissions: [
        "transactions.create",
        "shifts.own.manage"
    ],
  },
  {
    name: "API Client",
    description: "For backend services like the Flutter POS.",
    permissions: [
        "transactions.create",
        "inventory.view"
    ],
  },
];

const permissionCategories = ["Dashboard", "Reports", "Sales", "Inventory", "Shifts", "Settings"];


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
          <CardDescription>Define what each role can access and do within the application and API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Role</TableHead>
                  {permissionCategories.map(cat => (
                    <TableHead key={cat}>{cat}</TableHead>
                  ))}
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.name}>
                    <TableCell className="font-medium">
                        <div>{role.name}</div>
                        <div className="text-xs text-muted-foreground font-normal">{role.description}</div>
                    </TableCell>
                    {permissionCategories.map(cat => (
                        <TableCell key={cat}>
                           <div className="flex flex-col gap-2">
                             {allPermissions.filter(p => p.category === cat).map((permission) => (
                               <div key={permission.id} className="flex items-center gap-2">
                                 <Checkbox 
                                   id={`${role.name}-${permission.id}`} 
                                   checked={role.permissions.includes(permission.id)}
                                   disabled={role.name === 'Owner'}
                                 />
                                 <Label htmlFor={`${role.name}-${permission.id}`} className="font-normal text-sm">{permission.label}</Label>
                               </div>
                             ))}
                           </div>
                        </TableCell>
                    ))}
                    <TableCell>
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={role.name === 'Owner'}>
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
