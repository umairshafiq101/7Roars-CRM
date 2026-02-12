"use client";

import { useState, useEffect } from "react";
import { TeamMemberCard } from "@/components/modules/team/TeamMemberCard";
import { getTeamMembers, updateMemberRole, deactivateMember, addMember } from "@/actions/team";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSession } from "@/lib/auth-client";
import { Users, UserPlus, X } from "lucide-react";

export default function TeamPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const onlineUsers = useOnlineUsers(session?.user?.id, session?.user?.name);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("EMPLOYEE");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  async function fetchMembers() {
    setLoading(true);
    try {
      const result = await getTeamMembers();
      if (result.success && result.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMembers(result.data as any[]);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleRoleChange(memberId: string, role: string) {
    const result = await updateMemberRole({ memberId, role });
    if (result.success) {
      fetchMembers();
    }
  }

  async function handleDeactivate(memberId: string) {
    if (!confirm("Deactivate this team member?")) return;
    const result = await deactivateMember(memberId);
    if (result.success) {
      fetchMembers();
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);

    try {
      const result = await addMember({
        name: addName,
        email: addEmail,
        password: addPassword,
        role: addRole,
      });

      if (result.success) {
        setShowAddForm(false);
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddRole("EMPLOYEE");
        fetchMembers();
      } else {
        setAddError(result.error || "Failed to add member");
      }
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage team members and view online status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2">
            <Users className="h-4 w-4 text-[var(--primary)]" />
            <span className="text-sm font-medium">{members.length} members</span>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Team Member</h2>
            <button
              onClick={() => { setShowAddForm(false); setAddError(""); }}
              className="rounded-md p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {addError && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{addError}</div>
          )}

          <form onSubmit={handleAddMember} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Test Employee"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="employee@7roars.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Role</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--accent)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50"
              >
                {addLoading ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Online/Offline Summary */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm">
            {onlineUsers.size} Online
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
          <span className="text-sm">
            {members.length - onlineUsers.size} Offline
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-12 text-center">
          <p className="text-[var(--muted-foreground)]">
            No team members found. Click &quot;Add Member&quot; to invite team members.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              isOnline={onlineUsers.has(member.user.id)}
              onRoleChange={handleRoleChange}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
