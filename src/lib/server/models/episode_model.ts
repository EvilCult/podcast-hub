export type EpisodeData = {
    id: number;
    title: string;
    digest: string | null;
    url: string | null;
    radio_id: number;
    duration: number | null;
    pub_date: number | null;
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
};
