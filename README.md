workshop-upload
===============

Upload an addon to the Garry's Mod Steam Workshop, or a mod for another game such as Slay the Spire 2.

**Features**

* Upload an addon to the Garry's Mod Steam Workshop.
    * Includes changelog and icon.
* Other games through [game profiles](#games), picked by `appid`.
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

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gmod-workshop/workshop-upload@v1
        with:
          username: ${{ secrets.STEAM_USERNAME }}
          vdf: ${{ secrets.STEAM_VDF }}
          id: ${{ secrets.ADDON_ID }}
          markdown-changelog: ${{ github.event.release.body }}
          folder: ./
```

**Slay the Spire 2**

```yaml
      - uses: gmod-workshop/workshop-upload@v1
        with:
          appid: 2868840
          username: ${{ secrets.STEAM_USERNAME }}
          vdf: ${{ secrets.STEAM_VDF }}
          id: ${{ vars.WORKSHOP_ID }}
          folder: ./artifacts/mods/MyMod   # MyMod.json, MyMod.dll, MyMod.pck
          icon: ./workshop/image.png
          markdown-changelog: ${{ github.event.release.body }}
```

**Inputs**

| Name | Description | Required |
| ---- | ----------- | -------- |
| `username` | Steam username | Yes |
| `password` | Steam password | No |
| `totp` | Steam TOTP code | No |
| `vdf` | Steam account VDF (base64) | No |
| `folder` | Addon directory | Yes |
| `appid` | Steam app ID of the game. Picks the [game profile](#games). Default `4000` (Garry's Mod). | No |
| `id` | Workshop item ID to update. Leave empty to create a new item. | No |
| `title` | Addon title | No |
| `description` | Addon description (Steam BBCode) | No |
| `markdown-description` | Addon description (Markdown, converted to BBCode) | No |
| `changelog` | Change note (Steam BBCode) | No |
| `markdown-changelog` | Change note (Markdown, converted to BBCode) | No |
| `icon` | Path to the preview image (under 1 MB). New items get a default icon if empty. | No |
| `visibility` | `public`, `friends_only`, `private` or `unlisted` (or `0`-`3`). Empty keeps the current visibility. | No |

One login method (`password`, `totp` or `vdf`) is required. Fields left empty are left unchanged on the Workshop.

**Outputs**

| Name | Description |
| ---- | ----------- |
| `id` | The published Workshop item ID. Save it after creating a new item, and pass it as `id` from then on. |

Games
-----

`appid` picks how `folder` is prepared before upload:

| Game | `appid` | What happens |
| ---- | ------- | ------------ |
| Garry's Mod | `4000` (default) | The folder is packed into a `.gma` with [fastgmad](https://github.com/WilliamVenner/fastgmad). New items get a default icon. |
| Slay the Spire 2 | `2868840` | The folder is uploaded as is, after checking each mod manifest (`<id>.json`, at the top level or one folder down) is named after its `id` and that the `.dll` and `.pck` its `has_dll` and `has_pck` promise are there. |
| Any other game | its app ID | The folder is uploaded as is. |

To add a game, write a profile in [`src/games/`](src/games/) and list it in [`src/games/index.ts`](src/games/index.ts).

Authentication
--------------

There are three ways to authenticate with Steam:

* Password
* TOTP
* VDF (recommended)

**Password**

You can use your Steam password to login. This is the least secure method, as this requires Steam Guard to be disabled.

**TOTP**

You can use your Steam TOTP code to login. This requires Steam Guard to be enabled, and you must have a code ready when the workflow runs. This is **not** recommended, as it is unreliable.

**VDF**

You can use your Steam account VDF to login. This is the most secure method.

*Generating a VDF*

* To create a VDF, you must install SteamCMD locally and login to your account.
  * You can have SteamGuard enabled. You will be prompted to enter a code. This is only required once.
* The folder containing SteamCMD should not contain a `config` directory with a `config.vdf` file.
* Copy the contents of this file and base64 encode it. This is your VDF.
  * You can use `base64` on Linux or `certutil -encode` on Windows.
  * You can use this [online tool](https://www.base64encode.org/) to encode the file.
* Create a secret in your repository containing the base64 encoded VDF and pass it to the action.