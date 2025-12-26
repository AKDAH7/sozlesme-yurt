import { UserForm } from "@/components/users/UserForm";
import { requirePermission } from "@/lib/auth/permissions";

export default async function Page() {
  await requirePermission("users:manage");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Create User</h1>
        <p className="text-sm text-muted-foreground">Admin only</p>
      </div>

      <UserForm />
    </div>
  );
}
