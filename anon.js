const fs = require('fs');
const fsExtra = require('fs-extra');
const AdmZip = require('adm-zip');
const FileType = require('file-type');
const randomWords = require('random-words');
const variables = require('./variables.json');
const secret = require('./secret.json');
const axios = require("axios");

// so osu api doesn't get mad
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// get user details
async function getUser(name) {
    const url = `https://osu.ppy.sh/api/get_user?k=${secret.token}&u=${name}`;
    const res = await axios.get(url);

    return res.data[0];
}


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
    console.log(`---`);

    // extract everything to ./temp
    const zip = new AdmZip(`./maps.zip`);
    const zipEntries = zip.getEntries();
    zip.extractAllTo('./temp/unpacked', true);

    let csv = '';

    for (const [upperIndex, zipEntry] of zipEntries.entries()) {
        const oszString = zipEntry.entryName;
        console.log(`Filename: '${oszString}'`);
        const folderString = upperIndex + oszString; // add index for distinct folder name, otherwise contests with the same song get extracted into the same folder

        // skip unfit submissions
        if (!oszString.includes('.osz')) {
            console.log(`Error: file is not '.osz' format.'`);
            console.log(`File will be excluded from final output.'`);
        } else {
            //unpack valid submission
            const oszZip = new AdmZip(`./temp/unpacked/${oszString}`);
            oszZip.extractAllTo(`./temp/osz/${folderString}`, true);
            const osz = oszZip.getEntries();

            // set global-ish details
            const anonymous = randomWords({ exactly: 2, join: ' ' });
            let username;
            let osuId;

            // establish new osz
            const newOsz = new AdmZip();

            // anonymize each file
            for (const file of osz) {
                // find filetype for anonymous parameters
                const type = await findFileType(`./temp/osz/${folderString}/${file.entryName}`);

                // anonymize .osu
                if (file.name.includes('osu') && !type) {
                    const osu = file.getData().toString();
                    const lines = osu.split('\r\n');

                    let hitObject = false;

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];

                        if (line.includes('Creator:')) {
                            lines[i] = 'Creator:Anonymous';

                            username = line.slice(8, line.length);
                            console.log(`Submitted by: '${username}'`);

                            const user = await getUser(username);

                            if (!user) {
                                console.log(`Error: User cannot be found via username '${username}'. They likely changed their name recently.`);
                                console.log(`File will be included in final output, but you will need to set 'osuId' and correct 'username' in masking file manually.'`);
                                osuId = 0;
                            } else {
                                osuId = user.user_id;
                                console.log(`User ID: '${osuId}'`);
                            }
                        }

                        if (line.includes('Version:')) {
                            lines[i] = `Version:${anonymous}`;
                            console.log(`Anonymized as: '${anonymous}'`);
                        }

                        if (line.includes('Source:')) {
                            lines[i] = `Source:`;
                        }

                        if (line.includes('Tags:')) {
                            lines[i] = `Tags:`;
                        }

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

            console.log('Generated new `.osz`');

            // update masking
            csv += `${username},${osuId},${anonymous}\n`;

            // ...

        }

        console.log('---');
    }

    // create masking file
    fs.writeFile(`./output/${variables.name} masking.csv`, csv, (error) => {
        if (error) throw err;
    });

    console.log('Generated key `.csv`');
    console.log('done');
}

reset();
anonymize();