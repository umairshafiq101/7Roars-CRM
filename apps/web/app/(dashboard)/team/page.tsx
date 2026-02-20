"use client";

import { useState, useEffect, useMemo } from "react";
import { getTeamMembers, updateMemberRole, deactivateMember, addMember } from "@/actions/team";
import type { MemberStatus } from "@/actions/team";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { useSession } from "@/lib/auth-client";
import { Sparkles, UserPlus, X } from "lucide-react";
import { TeamStatusFilter, type StatusFilterKey } from "@/components/modules/team/TeamStatusFilter";
import { TeamCard } from "@/components/modules/team/TeamCard";
import { TeamMemberDrawer } from "@/components/modules/team/TeamMemberDrawer";

export default function TeamPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilterKey>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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

  useEffect(() => { fetchMembers(); }, []);

  async function handleRoleChange(memberId: string, role: string) {
    const result = await updateMemberRole({ memberId, role });
    if (result.success) fetchMembers();
  }

  async function handleDeactivate(memberId: string) {
    if (!confirm("Deactivate this team member?")) return;
    const result = await deactivateMember(memberId);
    if (result.success) fetchMembers();
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    try {
      const result = await addMember({ name: addName, email: addEmail, password: addPassword, role: addRole });
      if (result.success) {
        setShowAddForm(false);
        setAddName(""); setAddEmail(""); setAddPassword(""); setAddRole("EMPLOYEE");
        fetchMembers();
      } else {
        setAddError(result.error || "Failed to add member");
      }
    } catch { setAddError("Something went wrong"); }
    finally { setAddLoading(false); }
  }

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<StatusFilterKey, number> = {
      all: members.length,
      working: 0, on_break: 0, idle: 0, stopped_work: 0, yet_to_start: 0,
    };
    for (const m of members) {
      const s = m.status as MemberStatus;
      if (s in counts) counts[s]++;
    }
    return counts;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (activeFilter === "all") return members;
    return members.filter((m) => m.status === activeFilter);
  }, [members, activeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">
            There {members.length === 1 ? "is" : "are"} {members.length} team member{members.length !== 1 ? "s" : ""} here.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/productivity-coach"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <Sparkles className="h-4 w-4" />
            Generate Productivity Coach Report
          </a>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-[#5B4FE9] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F43D9]"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <TeamStatusFilter
        active={activeFilter}
        counts={filterCounts}
        onChange={setActiveFilter}
        onRefresh={fetchMembers}
      />

      {/* Add Member Form */}
      {showAddForm && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Add Team Member</h2>
            <button
              onClick={() => { setShowAddForm(false); setAddError(""); }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {addError && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{addError}</div>
          )}

          <form onSubmit={handleAddMember} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" value={addName} onChange={(e) => setAddName(e.target.value)} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#5B4FE9] focus:ring-1 focus:ring-[#5B4FE9]"
                placeholder="Test Employee" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#5B4FE9] focus:ring-1 focus:ring-[#5B4FE9]"
                placeholder="employee@7roars.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} required minLength={8}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#5B4FE9] focus:ring-1 focus:ring-[#5B4FE9]"
                placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#5B4FE9] focus:ring-1 focus:ring-[#5B4FE9]">
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <button type="button" onClick={() => { setShowAddForm(false); setAddError(""); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={addLoading}
                className="rounded-lg bg-[#5B4FE9] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F43D9] disabled:opacity-50">
                {addLoading ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Member Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5B4FE9] border-t-transparent" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-400">
            {activeFilter === "all"
              ? 'No team members found. Click "Add Member" to invite team members.'
              : `No team members with status "${activeFilter.replace("_", " ")}".`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => (
            <TeamCard
              key={member.id}
              member={member}
              isOnline={onlineUsers.has(member.user.id)}
              onClick={() => setSelectedUserId(member.user.id)}
              onRoleChange={handleRoleChange}
              onDeactivate={handleDeactivate}
            />
          ))}
        </div>
      )}

      {/* Member Detail Drawer */}
      {selectedUserId && (
        <TeamMemberDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
