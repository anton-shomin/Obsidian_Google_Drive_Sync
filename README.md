Google Drive Sync for Obsidian

A community plugin to synchronize your Obsidian vault with Google Drive.

Features

Sync: Upload new local files, download new remote files, and update existing files based on modification time.

Bi-directional Deletions: Deleting a file on one side will delete it on the other (if previously synced).

Secure: Uses your own Google Cloud credentials ("Bring Your Own Key").

Control: Syncs to a dedicated folder (ObsidianVault) in Google Drive.

Installation

Since this plugin is not yet in the official community list, you need to install it manually.

1. Build the Plugin

Open a terminal in the project folder.

Run npm install to install dependencies.

Run npm run build to compile the code. This will generate a main.js file.

2. Install into Obsidian

Open your Obsidian vault folder.

Navigate to .obsidian/plugins/ (you might need to enable hidden files to see .obsidian).

Create a new folder named google-drive-sync.

Copy the following files from the project folder into this new folder:

main.js

manifest.json

styles.css

3. Enable the Plugin

Open Obsidian.

Go to Settings > Community plugins.

Turn off Restricted mode if enabled.

Click the "Reload plugins" icon.

Find Google Drive Sync in the list and enable it.

Configuration Guide

To use this plugin, you need to create your own Google Cloud Project and generate OAuth 2.0 credentials.

Step 1: Create a Google Cloud Project

Go to the Google Cloud Console.

Create a new project (e.g., named "Obsidian Sync").

Navigate to APIs & Services > Library.

Search for "Google Drive API" and click Enable.

Step 2: Configure OAuth Consent Screen

Navigate to APIs & Services > OAuth consent screen.

Select External User Type and click Create.

Fill in the required fields (App name, User support email, Developer contact).

Click Save and Continue.

Add Scope: https://www.googleapis.com/auth/drive.

Add your email to Test Users.

Step 3: Create Credentials

Navigate to APIs & Services > Credentials.

Click Create Credentials > OAuth client ID.

Select Web application.

Important: Under Authorized redirect URIs, add exactly:
https://obsidian.md

Click Create and copy the Client ID and Client Secret.

Step 4: Authorize in Obsidian

In Obsidian, go to Settings > Google Drive Sync.

Paste your Client ID and Client Secret.

Click Generate Auth URL.

Authorize the app in the browser.

You will be redirected to obsidian.md. Copy the code parameter from the URL bar (everything after code= up to &).

Paste the code into the plugin settings and click Login.

Usage

Click the "Sync with Google Drive" ribbon icon (refresh icon) to start a sync.

Or use the command "Sync Now" from the Command Palette.

The first sync creates ObsidianVault in Drive.

Subsequent syncs will propagate changes and deletions.

Development

npm run dev: Build in watch mode.