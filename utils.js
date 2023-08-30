import fs from 'fs'
import fspromises from 'fs/promises'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

export const downloadFile = async (url, init, file) => {
    const stream = fs.createWriteStream(file)
    const { body } = await fetch(url, init)
    await finished(Readable.fromWeb(body).pipe(stream))
}
//export const writeFile = async (file, content) => {
//    return await fspromises.writeFile(file, content, 'utf8')
//}
export const readFile = (file) => {
    let data = fs.readFileSync(file, 'utf8')
    return data
}
export const addDataToJSON = (file,data) => {
    let datafromfile = JSON.parse(readFile(file))
    datafromfile = datafromfile.concat(`,${JSON.stringify(data)}`)
    fs.writeFileSync(file, JSON.stringify(datafromfile))
}