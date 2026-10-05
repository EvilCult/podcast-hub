export type EpisodeData = {
    id: number;
    title: string;
    digest: string | null;
    url: string | null;
    radio_id: number;
    duration: number | null;
    pub_date: number | null;
    pos: number | null;
    play_time: number | null;
    is_del: number;
};

export type EpisodeCreate = {
    title: string;
    digest: string | null;
    url: string | null;
    radio_id: number;
    duration: number | null;
    pub_date: number | null;
};

export type EpisodeItem = {
    id: number;
    title: string;
    digest: string | null;
    url: string | null;
    duration: number | null;
    pub_date: number | null;
    pos: number | null;
    play_time: number | null;
    is_fav: boolean;
};

export type HistoryUpdate = {
    eid: number;
    pos: number;
    play_time: number;
    uid: number;
};
