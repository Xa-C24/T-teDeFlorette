PXa branding master for iOS / App Store

Place the approved PXa master icon from the chat in this folder with this exact name:

- `source-master-1024.png`

Why this file:

- `1024x1024` is the canonical App Store artwork size.
- This file stays untouched and acts as the single source of truth.
- All future iOS/web/icon exports should be generated from this file.

Recommended derived files from this master:

- `apple-touch-icon-180.png`
- `favicon-32.png`
- `favicon-16.png`
- `favicon.ico`

Suggested workflow:

1. Save the attached logo as `source-master-1024.png` in this folder.
2. Keep the composition square and centered.
3. Do not overwrite the master with compressed or resized exports.
4. Generate all downstream icons from this master only.

If we later add a native iOS project or a PWA manifest, this is the file to reuse.
