const cron = require("node-cron")
const {writeCrawlDataToJSON} = require("./crawler")
const VSurl = "https://www.vscinemas.com.tw/ShowTimes/"

const runVSCrawlwer = () => {
    cron.schedule('* * * * *', async () => {
        await writeCrawlDataToJSON(VSurl)
        console.log("Written showtimes to json file.")
    })
}

runVSCrawlwer()