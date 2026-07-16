export type User = { id: string; email: string; blocked: boolean; credit: number };

const db = new Map<string, User>();

export function findUser({ id }: { id: string }): User | undefined {
  return db.get(id);
}

export function creditBalance({ user }: { user: User }): number {
  if (user.blocked) {
    return 0;
  }
  return user.credit;
}
