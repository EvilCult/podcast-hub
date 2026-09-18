import { upsert } from '$lib/server/repos/db';
import type { HistoryUpdate } from '$lib/server/models/episode_model';

const TABLE = 'histories';

export function updateHistory(data: HistoryUpdate): boolean {
    return upsert(
        TABLE,
        {
            ...data
        },
        ['eid', 'uid']
    );
}
