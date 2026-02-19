import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { BaseElectronService } from '@harmonysync/core';
import { IStorageService, ServiceConfig } from '@harmonysync/core';
import { ScheduledEvent, Macro } from '@harmonysync/core';

export class JSONStorageService { }
