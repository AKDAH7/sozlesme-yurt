import UserClientTable, {
  type UserRowUi,
} from "@/components/users/UserClientTable";

export function UserTable(props: { users: UserRowUi[] }) {
  return <UserClientTable users={props.users} />;
}
