import { Plugin } from 'obsidian';
import { GoogleDriveSyncSettings, DEFAULT_SETTINGS, GoogleDriveSyncSettingTab } from './settings';
import { GoogleDriveService } from './google-drive';
import { SyncService } from './sync-service';

export default class GoogleDriveSyncPlugin extends Plugin {
	settings: GoogleDriveSyncSettings;
    driveService: GoogleDriveService;
    syncService: SyncService;

	async onload() {
		await this.loadSettings();

        this.driveService = new GoogleDriveService(this.settings, this.saveSettings.bind(this));
        this.syncService = new SyncService(this.app, this.driveService, this.settings);

		this.addRibbonIcon('refresh-cw', 'Sync with Google Drive', (evt: MouseEvent) => {
			this.syncService.sync();
		});

		this.addCommand({
			id: 'sync-google-drive',
			name: 'Sync Now',
			callback: () => {
				this.syncService.sync();
			}
		});

		this.addSettingTab(new GoogleDriveSyncSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
        // Update service settings reference
        if (this.driveService) {
            this.driveService.settings = this.settings;
        }
        if (this.syncService) {
            this.syncService.settings = this.settings;
        }
	}
}
