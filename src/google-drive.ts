import { requestUrl, RequestUrlParam, Notice } from 'obsidian';
import { GoogleDriveSyncSettings } from './settings';

export class GoogleDriveService {
    settings: GoogleDriveSyncSettings;
    saveSettings: () => Promise<void>;

    constructor(settings: GoogleDriveSyncSettings, saveSettings: () => Promise<void>) {
        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    getAuthUrl(): string {
        const params = new URLSearchParams({
            client_id: this.settings.clientId,
            redirect_uri: 'https://obsidian.md',
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/drive',
            access_type: 'offline',
            prompt: 'consent'
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: 'https://oauth2.googleapis.com/token',
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code: code,
                    client_id: this.settings.clientId,
                    client_secret: this.settings.clientSecret,
                    redirect_uri: 'https://obsidian.md',
                    grant_type: 'authorization_code'
                }).toString()
            });

            const data = response.json;
            this.settings.accessToken = data.access_token;
            if (data.refresh_token) {
                this.settings.refreshToken = data.refresh_token;
            }
            await this.saveSettings();
            return true;
        } catch (e) {
            console.error('Error exchanging code for token', e);
            new Notice('Failed to exchange code for token.');
            return false;
        }
    }

    async refreshAccessToken(): Promise<boolean> {
        if (!this.settings.refreshToken) return false;
        try {
            const response = await requestUrl({
                url: 'https://oauth2.googleapis.com/token',
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.settings.clientId,
                    client_secret: this.settings.clientSecret,
                    refresh_token: this.settings.refreshToken,
                    grant_type: 'refresh_token'
                }).toString()
            });

            const data = response.json;
            this.settings.accessToken = data.access_token;
            await this.saveSettings();
            return true;
        } catch (e) {
            console.error('Error refreshing token', e);
            return false;
        }
    }

    async request(url: string, options: Omit<RequestUrlParam, 'url'> = {}): Promise<any> {
        if (!this.settings.accessToken) {
             throw new Error('No access token');
        }

        const makeRequest = async () => {
             return requestUrl({
                url,
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.settings.accessToken}`
                }
            });
        };

        try {
            return await makeRequest();
        } catch (e: any) {
            if (e.status === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                     return await makeRequest();
                }
            }
            throw e;
        }
    }

    async listFiles(folderId: string): Promise<any[]> {
        const query = `'${folderId}' in parents and trashed = false`;
        const response = await this.request(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, modifiedTime, md5Checksum)`);
        return response.json.files;
    }

    async getFileMetadata(fileId: string): Promise<any> {
        const response = await this.request(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id, name, mimeType, modifiedTime, md5Checksum`);
        return response.json;
    }

    async downloadFile(fileId: string): Promise<ArrayBuffer> {
        const response = await this.request(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
        return response.arrayBuffer;
    }

    async uploadFile(name: string, parentId: string, content: ArrayBuffer, mimeType: string = 'text/markdown'): Promise<any> {
        try {
            const boundary = 'foo_bar_baz';
            const metadata = {
                name: name,
                parents: [parentId],
                mimeType: mimeType
            };

            const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
            const mediaPartHeader = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
            const endBoundary = `\r\n--${boundary}--`;

            const encoder = new TextEncoder();
            const part1 = encoder.encode(metadataPart);
            const part2 = encoder.encode(mediaPartHeader);
            const part3 = new Uint8Array(content);
            const part4 = encoder.encode(endBoundary);

            const body = new Uint8Array(part1.length + part2.length + part3.length + part4.length);
            body.set(part1);
            body.set(part2, part1.length);
            body.set(part3, part1.length + part2.length);
            body.set(part4, part1.length + part2.length + part3.length);

            const response = await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: body.buffer
            });

            return response.json;
        } catch (e) {
            console.error(`Failed to upload file ${name}`, e);
            throw e;
        }
    }

    async updateFile(fileId: string, content: ArrayBuffer, mimeType: string = 'text/markdown'): Promise<any> {
        try {
            const response = await this.request(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': mimeType
                },
                body: content
            });
            return response.json;
        } catch (e) {
            console.error(`Failed to update file ${fileId}`, e);
            throw e;
        }
    }

    async trashFile(fileId: string): Promise<any> {
        try {
            const response = await this.request(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                 method: 'PATCH',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ trashed: true })
            });
            return response.json;
        } catch (e) {
            console.error(`Failed to trash file ${fileId}`, e);
            throw e;
        }
    }

    async createFolder(name: string, parentId: string): Promise<any> {
        const metadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };

        const response = await this.request('https://www.googleapis.com/drive/v3/files', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(metadata)
        });
        return response.json;
    }

    async createSyncFolder(): Promise<string> {
        const metadata = {
            name: 'ObsidianVault',
            mimeType: 'application/vnd.google-apps.folder'
        };
        const response = await this.request('https://www.googleapis.com/drive/v3/files', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(metadata)
        });
        return response.json.id;
    }
}
