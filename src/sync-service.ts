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

        // Инициализируем историю файлов для отслеживания удалений
        const historySet = new Set(this.settings.filesOnLastSync || []);
        const newHistorySet = new Set<string>();

        try {
            // Передаем сеты в рекурсивную функцию
            await this.syncFolder('', this.settings.syncFolderId, historySet, newHistorySet);

            // Сохраняем новое состояние файлов после успешной синхронизации
            this.settings.filesOnLastSync = Array.from(newHistorySet);
            this.settings.lastSyncTime = Date.now();
            await this.driveService.saveSettings();
            new Notice('Sync completed.');
        } catch (e) {
            console.error('Sync failed', e);
            new Notice('Sync failed. Check console for details.');
        }
    }

    async syncFolder(localPath: string, remoteFolderId: string, historySet: Set<string>, newHistorySet: Set<string>) {
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
                    // Файл есть локально, но нет удаленно.
                    // Если он был в истории -> значит удален удаленно -> удаляем локально.
                    if (historySet.has(file.path)) {
                        new Notice(`Deleting local ${file.name} (remote deletion detected)...`);
                        await this.app.vault.delete(file);
                    } else {
                        // Иначе это новый локальный файл -> загружаем.
                        new Notice(`Uploading ${file.name}...`);
                        const content = await this.app.vault.readBinary(file);
                        await this.driveService.uploadFile(file.name, remoteFolderId, content);
                        newHistorySet.add(file.path);
                    }
                } else {
                    const remoteTime = new Date(remoteFile.modifiedTime).getTime();
                    const localTime = file.stat.mtime;

                    if (localTime > remoteTime + 5000) {
                        new Notice(`Updating ${file.name} (local is newer)...`);
                         const content = await this.app.vault.readBinary(file);
                         await this.driveService.updateFile(remoteFile.id, content);
                    } else if (remoteTime > localTime + 5000) {
                         new Notice(`Downloading ${file.name} (remote is newer)...`);
                         const content = await this.driveService.downloadFile(remoteFile.id);
                         await this.app.vault.modifyBinary(file, content);
                    }
                    newHistorySet.add(file.path);
                    remoteFileMap.delete(file.name);
                }
            } else if (file instanceof TFolder) {
                let subRemoteFolderId;
                if (!remoteFile) {
                    if (historySet.has(file.path)) {
                        new Notice(`Deleting local folder ${file.name} (remote deletion detected)...`);
                        await this.app.vault.delete(file, true);
                        continue;
                    }
                    const newFolder = await this.driveService.createFolder(file.name, remoteFolderId);
                    subRemoteFolderId = newFolder.id;
                    newHistorySet.add(file.path);
                } else {
                    if (remoteFile.mimeType !== 'application/vnd.google-apps.folder') {
                        console.warn(`Conflict: ${file.name} is folder locally but file remotely.`);
                        continue;
                    }
                    subRemoteFolderId = remoteFile.id;
                    remoteFileMap.delete(file.name);
                    newHistorySet.add(file.path);
                }
                await this.syncFolder(file.path, subRemoteFolderId, historySet, newHistorySet);
            }
        }

        // Проходим по оставшимся удаленным файлам (которых нет локально)
        for (const [name, remoteFile] of remoteFileMap) {
             const currentPath = localPath === '' ? name : `${localPath}/${name}`;

             // Если файл был в истории, но сейчас его нет локально -> значит удален локально -> удаляем удаленно
             if (historySet.has(currentPath)) {
                 new Notice(`Deleting remote ${name} (local deletion detected)...`);
                 await this.driveService.trashFile(remoteFile.id);
                 continue;
             }

             // Иначе это новый удаленный файл -> скачиваем
             if (remoteFile.mimeType === 'application/vnd.google-apps.folder') {
                 if (!this.app.vault.getAbstractFileByPath(currentPath)) {
                     await this.app.vault.createFolder(currentPath);
                 }
                 newHistorySet.add(currentPath);
                 await this.syncFolder(currentPath, remoteFile.id, historySet, newHistorySet);
             } else {
                 new Notice(`Downloading new file ${name}...`);
                 const content = await this.driveService.downloadFile(remoteFile.id);
                 await this.app.vault.createBinary(currentPath, content);
                 newHistorySet.add(currentPath);
             }
        }
    }
}