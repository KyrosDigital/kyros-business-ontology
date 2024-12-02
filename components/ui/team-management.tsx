import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Plus, UserMinus } from "lucide-react"

// Mock data for demonstration
const teamMembers = [
  { id: 1, email: "john@example.com", role: "Admin" },
  { id: 2, email: "sarah@example.com", role: "Member" },
  { id: 3, email: "mike@example.com", role: "Member" },
]

const MAX_TEAM_MEMBERS = 5

export function TeamManagement() {
  const availableSeats = MAX_TEAM_MEMBERS - teamMembers.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and invite new ones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {teamMembers.length} of {MAX_TEAM_MEMBERS} seats used
                </span>
                <span className="text-sm text-muted-foreground">
                  {availableSeats} seats available
                </span>
              </div>
              <Progress value={(teamMembers.length / MAX_TEAM_MEMBERS) * 100} />
            </div>
            
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Invite Team Member
            </Button>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 