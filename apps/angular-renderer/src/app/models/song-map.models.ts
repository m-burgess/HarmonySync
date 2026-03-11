import { SongMap } from '@harmonysync/core';

export interface SongMapModalData {
    songName: string;
    songPath: string;
    existingMap?: SongMap;
}
