export type RadioData = {
    id: number;
    title: string;
    cover: string | null;
    digest: string | null;
    feed: string;
    resource: string | null;
    last_update: number | null;
    is_del: number;
};

export type RadioCreate = {
    title: string;
    cover: string | null;
    digest: string | null;
    feed: string;
    resource: string | null;
    last_update: number | null;
};

export type RadioItem = {
    id: number;
    title: string;
    cover: string | null;
    digest: string | null;
    last_update: number | null;
};
