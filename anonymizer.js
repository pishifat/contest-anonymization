const fs = require('fs');
const fsExtra = require('fs-extra');
const AdmZip = require('adm-zip');
const FileType = require('file-type');
const randomWords = require('random-words');
const variables = require('./variables.json');

// find filetype
async function findFileType(file) {
    return await FileType.fromFile(file);
}

function reset() {
    // reset directories
    const directories = ['./temp/unpacked', './temp/osz', './output'];
    
    for (const dir of directories) {
        if (fs.existsSync(dir)) {
            fsExtra.emptyDirSync(dir);
        } else {
            fs.mkdirSync(dir);
        }
    }

    // reset masking
    if (fs.existsSync(`./${variables.name} masking.csv`)) {
        fs.unlinkSync(`./${variables.name} masking.csv`);
    }
}

// generate
async function anonymize() {
    console.log('start');

    // extract everything to ./temp
    const zip = new AdmZip(`./contest-${variables.id}.zip`);
    const zipEntries = zip.getEntries();
    zip.extractAllTo('./temp/unpacked', true);

    let csv = '';

    for (const zipEntry of zipEntries) {
        const directoryString = zipEntry.entryName; // Username (osuId)/Artist - Title (Difficulty).osz
        const oszString = zipEntry.name; // Artist - Title (Difficulty).osz
        const oszIndex = directoryString.indexOf(oszString);
        const folderString = directoryString.slice(0, oszIndex - 1); // Username (osuId)
        const osuIdIndexStart = folderString.indexOf(' (');
        const osuIdIndexEnd = folderString.indexOf(')');
    
        const username = folderString.slice(0, osuIdIndexStart); // Username
        const osuId = parseInt(folderString.slice(osuIdIndexStart + 2, osuIdIndexEnd)); // osuId
        const anonymous = randomWords({ exactly: 2, join: ' '});

        console.log(`User: ${username} (${osuId})`);
        console.log(`Anon: ${anonymous}`);

        // skip unfit submissions
        if (!oszString.includes('.osz')) {
            console.log(`Error: didn't submit a .osz file`);
            console.log('---');
            continue;
        };

        const oszZip = new AdmZip(`./temp/unpacked/${directoryString}`);
        oszZip.extractAllTo(`./temp/osz/${folderString}`, true);
        const osz = oszZip.getEntries();

        const newOsz = new AdmZip();

        for (const file of osz) {
            const type = await findFileType(`./temp/osz/${folderString}/${file.entryName}`);

            if (file.name.includes('.osu') && !type) {
                const osu = file.getData().toString();
                const lines = osu.split('\r\n');

                let hitObject = false; // for taiko. triggers when [HitObjects] is reached

                // anonymize .osu file
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    if (line.includes('Creator:')) lines[i] = 'Creator:Anonymous';      // replace creator name
                    if (line.includes('Version:')) lines[i] = `Version:${anonymous}`;   // replace difficulty name
                    if (line.includes('Source:')) lines[i] = `Source:`;                 // replace source
                    if (line.includes('Tags:')) lines[i] = `Tags:`;                     // replace tags
                    if (!variables.multipleBeatmaps && (line.includes('.png') || line.includes('.jpg'))) {               // replace background file name
                        const pngIndex = line.indexOf('.png');
                        const jpgIndex = line.indexOf('.jpg');
                        const imageIndex = pngIndex > jpgIndex ? pngIndex : jpgIndex;
                        lines[i] = '0,0,"background' + line.slice(imageIndex, line.length);
                    }

                    // anonymization specific to taiko
                    if (variables.taiko) {
                        if (hitObject) {  // parse line for new hitObject coordinates
                            let lineSplit = line.split(',');
                            if (lineSplit.length > 1) {
                                lineSplit[0] = '256';
                                lineSplit[1] = '192';

                                // reconstruct hitobject line
                                let newLine = '';

                                for (const element of lineSplit) {
                                    newLine += element;
                                    newLine += ',';
                                }
                                
                                lines[i] = newLine.slice(0, newLine.length - 1);                // replace hitObject coordinates
                            }
                        }

                        if (line.includes('CircleSize:')) lines[i] = 'CircleSize:5';            // replace circle size
                        if (line.includes('ApproachRate:')) lines[i] = 'ApproachRate:9';        // replace approach rate
                        if (line.includes('StackLeniency:')) lines[i] = 'StackLeniency: 0.7';   // replace stack leniency
                        if (line.includes('[HitObjects]')) hitObject = true;                    // trigger hitObject
                    }
                }

                // reconstruct .osu
                let text = '';

                for (const line of lines) {
                    text += line;
                    text += '\r\n';
                }

                const rng = Math.floor(Math.random() * 727); // workaround for contest with multiple .osu files
                newOsz.addFile(`beatmap${rng} (${anonymous}).osu`, Buffer.from(text, 'utf8'));
            } else if (!variables.multipleBeatmaps && type && (type.mime == 'image/jpeg' || type.mime == 'image/png')) {
                fs.renameSync(`./temp/osz/${folderString}/${file.entryName}`, `./temp/osz/${folderString}/background.${type.ext}`);
                newOsz.addLocalFile(`./temp/osz/${folderString}/background.${type.ext}`);
            } else {
                newOsz.addLocalFile(`./temp/osz/${folderString}/${file.entryName}`);
            }
        }

        // generate .osz
        newOsz.writeZip(`./output/${variables.name} - ${anonymous}.osz`);

        // update masking
        csv += `${username},${osuId},${anonymous}\n`;

        // ...
        console.log('---');
    }
    
    // create masking file
    fs.writeFile(`${variables.name} masking.csv`, csv, (error) => { 
        if (error) throw err; 
    });

    console.log('done');
}

reset();
anonymize();