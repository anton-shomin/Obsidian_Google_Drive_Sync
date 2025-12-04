import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { GoogleDriveService } from './google-drive';

export interface GoogleDriveSyncSettings {
	clientId: string;
	clientSecret: string;
	accessToken: string;
	refreshToken: string;
	syncFolderId: string;
	lastSyncTime: number;
	filesOnLastSync: string[]; // Добавлено для отслеживания удалений
}

export const DEFAULT_SETTINGS: GoogleDriveSyncSettings = {
	clientId: '',
	clientSecret: '',
	accessToken: '',
	refreshToken: '',
	syncFolderId: '',
	lastSyncTime: 0,
	filesOnLastSync: [] // Инициализация пустого списка
}

interface IGoogleDriveSyncPlugin {
    settings: GoogleDriveSyncSettings;
    saveSettings(): Promise<void>;
    driveService: GoogleDriveService;
}

export class GoogleDriveSyncSettingTab extends PluginSettingTab {
	plugin: IGoogleDriveSyncPlugin;

	constructor(app: App, plugin: IGoogleDriveSyncPlugin) {
		super(app, plugin as any);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
        const driveService = this.plugin.driveService;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Google Drive Sync Settings'});

		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('Your Google Cloud Project Client ID')
			.addText(text => text
				.setPlaceholder('Enter your Client ID')
				.setValue(this.plugin.settings.clientId)
				.onChange(async (value) => {
					this.plugin.settings.clientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client Secret')
			.setDesc('Your Google Cloud Project Client Secret')
			.addText(text => text
				.setPlaceholder('Enter your Client Secret')
				.setValue(this.plugin.settings.clientSecret)
				.onChange(async (value) => {
					this.plugin.settings.clientSecret = value;
					await this.plugin.saveSettings();
				}));

        containerEl.createEl('h3', {text: 'Authentication'});

        if (this.plugin.settings.accessToken) {
             containerEl.createEl('p', {text: 'Logged in.', cls: 'auth-success'});
             new Setting(containerEl)
                .setName('Logout')
                .addButton(button => button
                    .setButtonText('Logout')
                    .onClick(async () => {
                        this.plugin.settings.accessToken = '';
                        this.plugin.settings.refreshToken = '';
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        } else {
             new Setting(containerEl)
                .setName('Step 1: Get Authorization Code')
                .setDesc('Click the button to open the authorization page. After authorizing, you will be redirected to "obsidian.md". Copy the "code" parameter from the URL in your browser address bar (e.g., ...?code=4/...).')
                .addButton(button => button
                    .setButtonText('Generate Auth URL')
                    .onClick(() => {
                        if (!this.plugin.settings.clientId) {
                            new Notice('Please enter Client ID first');
                            return;
                        }
                        const url = driveService.getAuthUrl();
                        window.open(url);
                    }));

             let authCode = '';
             new Setting(containerEl)
                .setName('Step 2: Enter Authorization Code')
                .setDesc('Paste the code you copied here.')
                .addText(text => text
                    .setPlaceholder('Paste code here')
                    .onChange(value => {
                        authCode = value;
                    }))
                .addButton(button => button
                    .setButtonText('Login')
                    .onClick(async () => {
                        if (!authCode) {
                            new Notice('Please enter the auth code.');
                            return;
                        }
                        const success = await driveService.exchangeCodeForToken(authCode);
                        if (success) {
                            new Notice('Successfully logged in!');
                            this.display();
                        }
                    }));
        }

        new Setting(containerEl)
            .setName('Sync Folder ID')
            .setDesc('The ID of the folder in Google Drive to sync with. If empty, a folder named "ObsidianVault" will be created on first sync.')
            .addText(text => text
                .setPlaceholder('Folder ID')
                .setValue(this.plugin.settings.syncFolderId)
                .onChange(async (value) => {
                    this.plugin.settings.syncFolderId = value;
                    await this.plugin.saveSettings();
                }));
	}
}