workshop-upload
===============

Upload an addon to the Garry's Mod Steam Workshop.

**Features**

* Upload an addon to the Garry's Mod Steam Workshop.
    * Includes changelog and icon.
* Login using password, TOTP, or VDF (recommended).
* Uses completely open source tools (SteamCMD, fastgmad)
    * Other actions use closed source binaries which might steal your credentials.
* Includes CLI for local use and testing.

Usage
-----

You can use this action in your workflow by referencing it in your workflow file.

```
gmod-workshop/workshop-upload@v1
```

**Advanced Example**

```yaml
name: Publish

# On release
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: gmod-workshop/workshop-upload@v1
        with:
          username: ${{ secrets.STEAM_USERNAME }}
          vdf: ${{ secrets.STEAM_VDF }}
          id: ${{ secrets.ADDON_ID }}
          changelog: ${{ github.event.release.body }}
          dir: ./
```
