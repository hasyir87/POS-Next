import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, PlayCircle } from "lucide-react";

const shiftHistory = [
    { id: "SFT001", date: "2023-10-26", cashier: "Alice", start: "$150.00", end: "$1632.50", status: "Closed" },
    { id: "SFT002", date: "2023-10-26", cashier: "Bob", start: "$150.00", end: "$1450.75", status: "Closed" },
    { id: "SFT003", date: "2023-10-27", cashier: "Alice", start: "$150.00", end: "$1780.00", status: "Closed" },
    { id: "SFT004", date: "2023-10-27", cashier: "Charlie", start: "$150.00", end: "$980.25", status: "Closed" },
    { id: "SFT005", date: "2023-10-28", cashier: "Bob", start: "$150.00", end: "---", status: "Active" },
];

export default function ShiftsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="font-headline text-3xl font-bold">Shift Management</h1>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <CheckCircle className="mr-2 h-4 w-4" /> End Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">End Shift</DialogTitle>
                                <DialogDescription>
                                    Count the cash in the drawer and enter the final amount to close the shift.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="ending-cash" className="text-right">Ending Cash</Label>
                                    <Input id="ending-cash" defaultValue="$0.00" className="col-span-3" />
                                </div>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Shift Summary</CardDescription>
                                        <CardTitle className="text-2xl">$1,300.75</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs text-muted-foreground">+ $1150.75 from cash sales</div>
                                    </CardContent>
                                </Card>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Confirm & End Shift</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <PlayCircle className="mr-2 h-4 w-4" /> Start Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="font-headline">Start New Shift</DialogTitle>
                                <DialogDescription>
                                    Enter the starting cash balance for this new shift.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="starting-cash" className="text-right">Starting Cash</Label>
                                    <Input id="starting-cash" defaultValue="$150.00" className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Start Shift</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Shift History</CardTitle>
                    <CardDescription>A log of all past and current shifts.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Starting Balance</TableHead>
                                <TableHead className="text-right">Ending Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shiftHistory.map((shift) => (
                                <TableRow key={shift.id}>
                                    <TableCell>
                                        <div className="font-medium">{shift.date}</div>
                                        <div className="text-sm text-muted-foreground">{shift.id}</div>
                                    </TableCell>
                                    <TableCell>{shift.cashier}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 text-xs rounded-full ${shift.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-secondary'}`}>
                                            {shift.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">{shift.start}</TableCell>
                                    <TableCell className="text-right">{shift.end}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
