const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")

const header = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)\ AppleWebKit/537.36(KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'}

const crawlVSWeb = async (url) => { 
    try {
        const webContent = await axios.get(url, {headers: header})
        const $ = cheerio.load(webContent.data)

        const cinemasDetails = [];
        const cinemasInfo = getCinemasInfo($, cinemasDetails)
        
        const movieTimeTable = await getMoiveTimeTable(cinemasInfo)
        return movieTimeTable
    } catch (err) {
        console.error(err)
    }
}

const getCinemasInfo = ($, cinemasDetails) => {
    $('#CinemaNameTWInfoF option').each((_, element) => {
        const cinemaCode = $(element).attr('value')
        const cinemaName = $(element).text()
        if(cinemaCode) cinemasDetails.push({cinemaCode, cinemaName});
    });
    return cinemasDetails
}

const getMoiveTimeTable = async (cinemasDetails) => {
    const movieTimeTable = {};
    await Promise.all(cinemasDetails.map(async (cinemaDetails) => {
        await delay(2000)
        const { cinemaCode, cinemaName } = cinemaDetails;
        movieTimeTable[cinemaName] = {};
        const timeTableUrl = "https://www.vscinemas.com.tw/ShowTimes/ShowTimes/GetShowTimes";
        try {
            const timeTable = await axios.post(
                timeTableUrl, 
                { CinemaCode: cinemaCode },
                { headers: header});
            const $ = cheerio.load(timeTable.data);
            const movieContainers = $('.col-xs-12');
            await formMovieTimeTable($, movieContainers, cinemaName, movieTimeTable);
        } catch (error) {
            console.error(`Error fetching data for cinema: ${cinemaName}`, error);
        }
    }));
    return movieTimeTable;
};

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

const formMovieTimeTable = async ($, movieContainers, cinemaName, movieTimeTable) => {
    await Promise.all(movieContainers.map(async (_, container) => {
        const movieName = $(container).find('.LangTW.MovieName').eq(0).text().trim()
        if(movieName){
            // Find all show dates for the movie
            const showDates = $(container).find('.LangTW.RealShowDate');
            // Find all show times for the movie
            const showTimeContainers = $(container).find('.SessionTimeInfo');
            const dateTimes = [];

            // Iterate through each show date and corresponding show time
            await Promise.all(showDates.map(async (index, dateElement) => {
                const date = $(dateElement).text().trim();
                const times = await getDataTimes($ ,$(showTimeContainers[index]))
                dateTimes.push({date, times})
            }));
            movieTimeTable[cinemaName][movieName] = dateTimes
        }
    }))
}

const getDataTimes = async ($, sessionTimeInfo) => {
    const dateTimes = [];
    await Promise.all(sessionTimeInfo.find('.col-xs-0').map(async (_, element) => {
        const time = await $(element).text().trim();
        dateTimes.push(time);
    }));
    return dateTimes;
};

const writeToJSON = (objData, fileName) => {
    const json = JSON.stringify(objData)
    fs.writeFileSync(fileName, json, 'utf-8', (err) => {
        if(err) console.error(err)
    })
}

const writeCrawlDataToJSON = async (url) => {
    const json = await crawlVSWeb(url)
    writeToJSON(json, "VSShowtime.json")
}

module.exports = {
    writeCrawlDataToJSON
}