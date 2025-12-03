import { App, TFile, TFolder, Notice } from 'obsidian';
import { GoogleDriveService } from './google-drive';
import { GoogleDriveSyncSettings } from './settings';

export class SyncService {
    app: App;
    driveService: GoogleDriveService;
    settings: GoogleDriveSyncSettings;

    constructor(app: App, driveService: GoogleDriveService, settings: GoogleDriveSyncSettings) {
        this.app = app;
        this.driveService = driveService;
        this.settings = settings;
    }

    async sync() {
        if (!this.settings.accessToken) {
            new Notice('Please log in to Google Drive first.');
            return;
        }

        new Notice('Starting sync...');

        if (!this.settings.syncFolderId) {
             try {
                const id = await this.driveService.createSyncFolder();
                this.settings.syncFolderId = id;
                await this.driveService.saveSettings();
                new Notice('Created "ObsidianVault" folder in Google Drive.');
            } catch (e) {
                new Notice('Failed to create sync folder in Drive.');
                console.error(e);
                return;
            }
        }

        try {
            await this.syncFolder('', this.settings.syncFolderId);
            this.settings.lastSyncTime = Date.now();
            await this.driveService.saveSettings();
            new Notice('Sync completed.');
        } catch (e) {
            console.error('Sync failed', e);
            new Notice('Sync failed. Check console for details.');
        }
    }

    async syncFolder(localPath: string, remoteFolderId: string) {
        const remoteFiles = await this.driveService.listFiles(remoteFolderId);
        const remoteFileMap = new Map(remoteFiles.map(f => [f.name, f]));

        const localFolder = localPath === '' ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(localPath);

        if (!(localFolder instanceof TFolder)) {
            console.error(`Local path ${localPath} is not a folder.`);
            return;
        }

        const localFiles = localFolder.children;

        for (const file of localFiles) {
            if (file.name.startsWith('.')) continue;

            const remoteFile = remoteFileMap.get(file.name);

            if (file instanceof TFile) {
                if (!remoteFile) {
                    new Notice(`Uploading ${file.name}...`);
                    const content = await this.app.vault.readBinary(file);
                    await this.driveService.uploadFile(file.name, remoteFolderId, content);
                } else {
                    const remoteTime = new Date(remoteFile.modifiedTime).getTime();
                    const localTime = file.stat.mtime;

                    if (localTime > remoteTime + 5000) { // 5s buffer
                        new Notice(`Updating ${file.name} (local is newer)...`);
                         const content = await this.app.vault.readBinary(file);
                         await this.driveService.updateFile(remoteFile.id, content);
                    } else if (remoteTime > localTime + 5000) {
                         new Notice(`Downloading ${file.name} (remote is newer)...`);
                         const content = await this.driveService.downloadFile(remoteFile.id);
                         await this.app.vault.modifyBinary(file, content);
                    }
                }
                if (remoteFile) remoteFileMap.delete(file.name);
            } else if (file instanceof TFolder) {
                let subRemoteFolderId;
                if (!remoteFile) {
                    const newFolder = await this.driveService.createFolder(file.name, remoteFolderId);
                    subRemoteFolderId = newFolder.id;
                } else {
                    if (remoteFile.mimeType !== 'application/vnd.google-apps.folder') {
                        console.warn(`Conflict: ${file.name} is folder locally but file remotely.`);
                        continue;
                    }
                    subRemoteFolderId = remoteFile.id;
                    remoteFileMap.delete(file.name);
                }
                await this.syncFolder(file.path, subRemoteFolderId);
            }
        }

        for (const [name, remoteFile] of remoteFileMap) {
             if (remoteFile.mimeType === 'application/vnd.google-apps.folder') {
                 const newLocalPath = localPath === '' ? name : `${localPath}/${name}`;
                 if (!this.app.vault.getAbstractFileByPath(newLocalPath)) {
                     await this.app.vault.createFolder(newLocalPath);
                 }
                 await this.syncFolder(newLocalPath, remoteFile.id);
             } else {
                 new Notice(`Downloading new file ${name}...`);
                 const content = await this.driveService.downloadFile(remoteFile.id);
                 const newLocalPath = localPath === '' ? name : `${localPath}/${name}`;
                 await this.app.vault.createBinary(newLocalPath, content);
             }
        }
    }
}
