# Google Drive Sync for Obsidian

A community plugin to synchronize your Obsidian vault with Google Drive.

## Features

- **Sync**: Upload new local files, download new remote files, and update existing files based on modification time.
- **Secure**: Uses your own Google Cloud credentials ("Bring Your Own Key").
- **Control**: Syncs to a dedicated folder in Google Drive.

## Setup Guide

To use this plugin, you need to create your own Google Cloud Project and generate OAuth 2.0 credentials. This ensures you have full control over your data and quota.

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., named "Obsidian Sync").
3. Navigate to **APIs & Services > Library**.
4. Search for "Google Drive API" and click **Enable**.

### Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** User Type and click **Create**.
3. Fill in the required fields:
   - **App name**: Obsidian Sync
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**.
5. On the **Scopes** step, click **Add or Remove Scopes**.
6. Search for `drive` and select the scope `https://www.googleapis.com/auth/drive` (See, edit, create, and delete all of your Google Drive files).
7. Click **Update** and then **Save and Continue**.
8. On the **Test Users** step, add your own email address as a test user. This allows you to use the app without verification.
9. Click **Save and Continue**.

### Step 3: Create Credentials

1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials** and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name it something like "Obsidian Plugin".
5. Under **Authorized redirect URIs**, add:
   `https://obsidian.md`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret**.

### Step 4: Configure the Plugin

1. Open Obsidian and go to **Settings > Community plugins**.
2. Enable **Google Drive Sync**.
3. Go to the plugin settings.
4. Paste your **Client ID** and **Client Secret**.
5. Click **Generate Auth URL**.
6. A browser window will open. Select your Google account and allow access.
   - *Note: You might see a "Google hasn't verified this app" warning. Click "Advanced" and then "Go to Obsidian Sync (unsafe)" since you are the developer.*
7. After authorizing, you will be redirected to a page that looks like `obsidian.md`.
8. Look at the URL in your browser's address bar. It will look like:
   `https://obsidian.md/?code=4/0AcvD...&scope=...`
9. Copy the long string after `code=` (up to the `&` symbol).
10. Paste this code into the **Authorization Code** field in the plugin settings.
11. Click **Login**.

You should now be logged in!

## Usage

- Click the "Sync with Google Drive" ribbon icon (refresh icon) to start a sync.
- Or use the command palette (Ctrl/Cmd + P) and search for "Sync Now".
- The first sync will create a folder named `ObsidianVault` in your Google Drive root.

## Limitations

- **Deletions**: Currently, the plugin does not propagate deletions. If you delete a file locally, it will be re-downloaded from Drive. If you delete it on Drive, it will be re-uploaded. To delete a file permanently, you must delete it from both locations.
- **Conflicts**: Simple "Last Write Wins" based on modification time.

## Development

To build this plugin:

1. `npm install`
2. `npm run build`
