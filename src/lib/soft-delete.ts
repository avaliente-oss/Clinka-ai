export const notDeleted = { deletedAt: null } as const;

export function activeWhere<T extends object>(where?: T): T & typeof notDeleted {
  return { ...(where ?? ({} as T)), ...notDeleted };
}
