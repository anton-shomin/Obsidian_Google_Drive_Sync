# Google Drive Sync for Obsidian

A community plugin to synchronize your Obsidian vault with Google Drive.

## Features

- **Sync**: Upload new local files, download new remote files, and update existing files based on modification time.
- **Bi-directional Deletions**: Deleting a file on one side will delete it on the other (if previously synced).
- **Secure**: Uses your own Google Cloud credentials ("Bring Your Own Key").
- **Control**: Syncs to a dedicated folder (`ObsidianVault`) in Google Drive.

## Installation

Since this plugin is not yet in the official community list, you need to install it manually.

### 1. Build the Plugin
1. Open a terminal in the project folder.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to compile the code. This will generate a `main.js` file.

### 2. Install into Obsidian
1. Open your Obsidian vault folder.
2. Navigate to `.obsidian/plugins/` (you might need to enable hidden files to see `.obsidian`).
3. Create a new folder named `google-drive-sync`.
4. Copy the following files from the project folder into this new folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`

### 3. Enable the Plugin
1. Open Obsidian.
2. Go to **Settings > Community plugins**.
3. Turn off **Restricted mode** if enabled.
4. Click the "Reload plugins" icon.
5. Find **Google Drive Sync** in the list and enable it.

## Configuration Guide

To use this plugin, you need to create your own Google Cloud Project and generate OAuth 2.0 credentials.

### Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., named "Obsidian Sync").
3. Navigate to **APIs & Services > Library**.
4. Search for "Google Drive API" and click **Enable**.

### Step 2: Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** User Type and click **Create**.
3. Fill in the required fields (App name, User support email, Developer contact).
4. Click **Save and Continue**.
5. Add Scope: `https://www.googleapis.com/auth/drive`.
6. Add your email to **Test Users**.

### Step 3: Create Credentials
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select **Web application**.
4. **Important**: Under **Authorized redirect URIs**, add exactly:
   `https://obsidian.md`
5. Click **Create** and copy the **Client ID** and **Client Secret**.

### Step 4: Authorize in Obsidian
1. In Obsidian, go to **Settings > Google Drive Sync**.
2. Paste your **Client ID** and **Client Secret**.
3. Click **Generate Auth URL**.
4. Authorize the app in the browser.
5. You will be redirected to `obsidian.md`. Copy the `code` parameter from the URL bar (everything after `code=` up to `&`).
6. Paste the code into the plugin settings and click **Login**.

## Usage

- Click the "Sync with Google Drive" ribbon icon (refresh icon) to start a sync.
- Or use the command "Sync Now" from the Command Palette.
- The first sync creates `ObsidianVault` in Drive.
- Subsequent syncs will propagate changes and deletions.

## Development

- `npm run dev`: Build in watch mode.
