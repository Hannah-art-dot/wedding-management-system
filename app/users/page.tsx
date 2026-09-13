import { UserManagementPanel } from "@/components/users/UserManagementPanel";

export const metadata = {
  title: "Users",
  description: "Manage admin and check-in staff accounts",
};

export default function UsersPage() {
  return (
    <main className="flex-1">
      <UserManagementPanel />
    </main>
  );
}
