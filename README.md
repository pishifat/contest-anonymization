# contest anonymization

anonymize `.osz` files by replacing these in the `.osu`:

- `Creator:`
- `Version:`
- `Source:`
- `Tags:`
- Background filename
- and a few extras for osu!taiko beatmaps (if specified):
    - `CircleSize:`
    - `ApproachRate:`
    - `StackLeniency:`
    - HitObject locations

this supports multiple `.osu` files too!

## setup

1. ensure all contest submissions are `.osz` files and compress them into a `.zip` file. place the `.zip` in the main directory
    - if the contest uses [osu!'s contest listing](https://osu.ppy.sh/community/contests) file structure, it should be named `contest-id.zip`
    - otherwise it should be named `maps.zip`
2. set variables in `variables.json`:
    - `id`: osu! contest listing ID. ignore this if it's not relevant to you
    - `name`: name of the contest (used in the filename of output `.osz`s)
    - `taiko`: set to `true` if contest is osu!taiko
    - `multipleBeatmaps`: set to `true` of `.osz` includes multiple `.osu` files
    - `customAnonymizationNames`: array of strings for anyone who wants specific formatting for anonymized names
3. if your contest does NOT use osu!'s contest listing, create a file in the main directory called `secret.json`. add this inside and replace your key:
```
{
    "token": "<YOUR OSU APIV1 KEY>"
}
```
4. create a folder titled `temp` in main directory

## how to run

in terminal...

- type `npm i`
- if using osu!'s contest listing file structure, type `node osuAnon.js`. otherwise type `node anon.js`

## output

read terminal for any errors while running

if successful, the newly generated `output` folder will have:

- anonymous `.osz` files
- `.csv` keying users to anonymous submission names

if you anonymized your contest for the [Mappers' Guild contest listing](https://mappersguild.com/contests/listing), paste the contents of the `.csv` into the relevant text input box to automatically sync anonymous names
