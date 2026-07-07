export interface ActivityLogEntry {
    id: string;
    actorUserId: string | null;
    familyId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

/** Activity entry joined with actor + family — used in the activity feed. */
export interface ActivityLogEntryWithContext extends ActivityLogEntry {
    actorDisplayName: string | null;
    actorEmail: string | null;
    familyName: string | null;
}
