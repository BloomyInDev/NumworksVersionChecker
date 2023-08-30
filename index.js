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
            webhook: { enabled: false, url: '' },
            calculators: [
                'n0100',
                'n0110',
                'n0115',
                'n0120',
                'N0120_PORTUGAL_PROTOTYPE_20210930',
            ],
            versions: ['stable'],
            cookie: '',
            baseUrl: 'https://my.numworks.com/firmwares/',
        }),
    )
}
const config = { ...JSON.parse(readFile('static/config.json')) }
let webhookClient
if (config.webhook.enabled) {
    webhookClient = new WebhookClient({ url: config.webhook.url })
}
const eventEmitter = new EventEmitter()
if (!fs.existsSync('static/versions.json')) {
    fs.writeFileSync('static/versions.json', JSON.stringify({}))
    console.log(`'static/versions.json' file does not exist, creating one`)
}
let knownLastVersion = { ...JSON.parse(readFile('static/versions.json')) }
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
        Object.keys(knownLastVersion).includes(calculator) == false ||
        knownLastVersion[calculator].version !== data.version
    ) {
        eventEmitter.emit('newversiondetected', {
            calculator: calculator,
            branch: branch,
            version: data.version,
        })
    }
    const filename = data.version.replace(/\./g, '-')
    knownLastVersion[calculator] = {
        version: data.version,
        size: data.size,
        commit: data.patch_level,
        filenameVersion: `${filename}.dfu`,
    }
    return Promise.resolve()
}
const getAll = async () => {
    console.log('Get all versions...')
    if (config.cookie == '') return
    let promises = []
    for (let index = 0; index < config.calculators.length; index++) {
        const calculator = config.calculators[index]
        promises.push(getLastVer(calculator, 'stable'))
    }
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
        `static/firmwares/${data.calculator}/${filename}.dfu`,
    )
    if (config.webhook.enabled) {
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

app.use('static', express.static('static'))
app.get('/', (req, res) => {
    let sendData = {}
    let error = false
    if (config.cookie == '') error = { status: true, cfg: config }
    Object.keys(knownLastVersion).forEach((key) => {
        const calculator = knownLastVersion[key]
        sendData[key] = {
            ...calculator,
            download: `http://${req.headers.host}/static/firmwares/${key}/${calculator.filenameVersion}`,
        }
    })
    res.json({ error: error, calculators: sendData })
})
const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Listening on ${port}`))
