export type EpisodeData = {
    id: number;
    title: string;
    url: string | null;
    radio_id: number;
    pub_date: number | null;
    is_del: number;
};

export type EpisodeCreate = {
    title: string;
    url: string | null;
    radio_id: number;
    pub_date: number | null;
};

export type EpisodeItem = {
    title: string;
    url: string | null;
    pub_date: number | null;
};
