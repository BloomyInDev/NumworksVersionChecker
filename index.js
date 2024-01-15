import { EmbedBuilder, WebhookClient } from 'discord.js'
import { schedule } from 'node-cron'
import { EventEmitter } from 'events'
import express from 'express'
import { downloadFile, readFile, addDataToJSON } from './utils.js'
import path, { join } from 'path'
import fs, { existsSync } from 'fs'
// Import Config / Create file
if (!fs.existsSync('static/config.json')) {
    console.log(`'static/config.json' file does not exist, creating one`)
    fs.writeFileSync(
        'static/config.json',
        JSON.stringify({
            integrations: { discord: { enabled: false, url: '' } },
            calculators: ['n0100', 'n0110', 'n0115', 'n0120'],
            versions: ['stable'],
            cookie: '',
            baseUrl: 'https://my.numworks.com/firmwares/',
        }),
    )
}
const config = { ...JSON.parse(readFile('static/config.json')) }
let webhookClient
if (config.integrations.discord.enabled) {
    webhookClient = new WebhookClient({ url: config.integrations.discord.url })
}
const eventEmitter = new EventEmitter()
if (!fs.existsSync('static/versions.json')) {
    let prepare_version_file = {}
    config.versions.forEach((version) => {
        prepare_version_file[version] = {}
    })
    fs.writeFileSync(
        'static/versions.json',
        JSON.stringify(prepare_version_file),
    )
    console.log(`'static/versions.json' file does not exist, creating one`)
}

let knownLastVersion = { ...JSON.parse(readFile('static/versions.json')) }
config.versions.forEach((version) => {
    if (!Object.keys(knownLastVersion).includes(version)) {
        knownLastVersion[version] = {}
    }
})
fs.writeFileSync(
    'static/versions.json',
    JSON.stringify(knownLastVersion),
    'utf-8',
)
console.log(knownLastVersion)

if (!fs.existsSync('static/firmwares')) {
    console.log(`'static/firmwares' folder does not exist, creating one`)
    fs.mkdirSync('static/firmwares')
}
for (let index = 0; index < config.calculators.length; index++) {
    const calculator = config.calculators[index]
    if (!fs.existsSync(`static/firmwares/${calculator}`)) {
        console.log(
            `'static/firmwares/${calculator}' folder does not exist, creating one`,
        )
        fs.mkdirSync(`static/firmwares/${calculator}`)
    }
}

const getLastVer = async (calculator, branch = 'stable') => {
    const headers = { Cookie: config.cookie }
    let dataraw = await fetch(
            `${config.baseUrl}/${calculator}/${branch}.json`,
            {
                headers,
            },
        ),
        data = await dataraw.json()
    if (
        Object.keys(knownLastVersion[branch]).includes(calculator) == false ||
        knownLastVersion[branch][calculator].version !== data.version
    ) {
        eventEmitter.emit('newversiondetected', {
            calculator: calculator,
            branch: branch,
            version: data.version,
            commit: data.patch_level,
        })
    }
    const filename = data.version.replace(/\./g, '-')
    knownLastVersion[branch][calculator] = {
        version: data.version,
        size: data.size,
        commit: data.patch_level,
        filenameVersion: `${filename}-${data.patch_level}.dfu`,
    }
    return Promise.resolve()
}
const getAll = async () => {
    console.log('Get all versions...')
    if (config.cookie == '') return
    let promises = []
    config.versions.forEach((version) => {
        for (let index = 0; index < config.calculators.length; index++) {
            const calculator = config.calculators[index]
            promises.push(getLastVer(calculator, version))
        }
    })
    await Promise.all(promises)
    console.table(knownLastVersion)
    fs.writeFileSync(
        'static/versions.json',
        JSON.stringify(knownLastVersion),
        'utf-8',
    )
}
eventEmitter.on('newversiondetected', async (data) => {
    const headers = { Cookie: config.cookie }
    const filename = data.version.replace(/\./g, '-')
    downloadFile(
        `${config.baseUrl}/${data.calculator}/${data.branch}.dfu`,
        { headers },
        `static/firmwares/${data.calculator}/${filename}-${data.commit}.dfu`,
    )
    if (config.integrations.discord.enabled) {
        const embed = new EmbedBuilder()
            .setTitle('New Update')
            .addFields(
                { name: 'Calculator', value: data.calculator },
                { name: 'Version', value: data.version },
                { name: 'Branch', value: data.branch },
            )
            .setTimestamp()
            .setFooter({ text: 'Made with love by Bloomy' })
            .setColor([255, 183, 52])

        webhookClient.send({
            content: '',
            username: 'NumworksVersionChecker',
            embeds: [embed],
        })
    }
})
schedule('0 0 * * *', () => {
    getAll()
})
//schedule('* * * * *', () => {
//    getAll()
//})
getAll()

const app = express()

app.use('/static', express.static('static'))
app.get('/', (req, res) => {
    res.redirect('/panel')
})
app.get('/api/raw-data', (req, res) => {
    let sendData = {}
    let error = { status: false }
    if (config.cookie == '')
        error = { status: true, why: 'numworks token missing' }
    else sendData = { ...knownLastVersion }
    res.json({ data: sendData, error })
})
app.get('/api/get-files-list', (req, res) => {
    let sendData = {}
    let error = { status: false }
    if (config.cookie == '')
        error = { status: true, why: 'numworks token missing' }
    else {
        const calcs = fs.readdirSync('./static/firmwares')
        calcs.forEach((calc) => {
            sendData[calc] = fs
                .readdirSync(`./static/firmwares/${calc}`)
                .map((e) => {
                    return { name: e, path: `/static/firmwares/${calc}/${e}` }
                })
        })
    }

    res.json({ data: sendData, error })
})
app.get('/panel', (req, res) => {
    res.send(readFile('./pages/index.html'))
})
app.get('/files', (req, res) => {
    res.send(readFile('./pages/files.html'))
})
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on ${port}`))
