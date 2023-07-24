const axios = require("axios")
const cheerio = require("cheerio")
const url = "https://www.vscinemas.com.tw/ShowTimes/"
const fs = require("fs")

const crawlVSWeb = async (url) => { 
    const webContent = await axios.get(url)
    const $ = cheerio.load(webContent.data)

    const cinemasDetails = [];
    const cinemasInfo = getCinemasInfo($, cinemasDetails)
    
    const movieTimeTable = await getMoiveTimeTable(cinemasInfo)
    return movieTimeTable
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
        const { cinemaCode, cinemaName } = cinemaDetails;
        movieTimeTable[cinemaName] = {};
        const timeTableUrl = "https://www.vscinemas.com.tw/ShowTimes/ShowTimes/GetShowTimes";
        try {
            const timeTable = await axios.post(timeTableUrl, { CinemaCode: cinemaCode });
            const $ = cheerio.load(timeTable.data);
            const movieContainers = $('.col-xs-12');
            await formMovieTimeTable($, movieContainers, cinemaName, movieTimeTable);
        } catch (error) {
            console.error(`Error fetching data for cinema: ${cinemaName}`, error);
        }
    }));
    return movieTimeTable;
};

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
                console.log({times})
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

const writeToJSON = (objData) => {
    const json = JSON.stringify(objData)
    fs.writeFileSync('VSShowTimes.json', json, 'utf-8', (err) => {
        if(err) console.error(err)
    })
}

const writeCrawlDataToJSON = async (url) => {
    const json = await crawlVSWeb(url)
    writeToJSON(json)
}

writeCrawlDataToJSON(url)
