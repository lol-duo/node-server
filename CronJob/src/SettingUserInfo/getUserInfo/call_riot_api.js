import SlackService from "../../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../../SQS/AwsSQSController.js";
import fetch from "node-fetch";
import mongoose from "mongoose";
import UserModel from "../../Model/UserInfo.js";

// get today date
function getTodayDate(){

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

console.log(getTodayDate());

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is running : Date " + getTodayDate());
}

// set mongoose
try {
    console.log(process.env.mongoDB_URI);
    await mongoose.connect(process.env.mongoDB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "riot"
    })
        .then(() => console.log("mongoDB connected"))
        .catch(
            async (err) => {
                // send Slack message
                const slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: ${err}`);

                //finish process
                process.exit(1);
            }
        );
} catch (err) {
    // send Slack message
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: ${err}`);

    //finish process
    process.exit(1);
}

// get SQS URL
let awsSQSController = AwsSQSController.getInstance();
let sqsURL = await awsSQSController.get_SQS_URL(process.env.SQS_NAME);

while (true){
    // get SQS message
    let message = await awsSQSController.getSQSMessage(sqsURL, 3600, 20, 1);
    if(message === null) break;

    // parse message
    let messageBody = JSON.parse(message[0].Body);

    // get tier, division, page
    let tier = messageBody.value.tier;
    let division = messageBody.value.division;
    let page = messageBody.value.page;

    let url = null;

    if(tier === "CHALLENGER") url = `${process.env.RIOT_SERVICE_URL}/challengerLeague`;
    else if(tier === "GRANDMASTER") url = `${process.env.RIOT_SERVICE_URL}/grandmasterLeague`;
    else if(tier === "MASTER") url = `${process.env.RIOT_SERVICE_URL}/masterLeague`;
    else url = `${process.env.RIOT_SERVICE_URL}/league/${tier}/${division}/${page}`;

    console.log(`tier : ${tier}, division : ${division}, page : ${page}, url: ${url}`);
    // get league
    let request; let count = 0; let now = new Date(); let leagueInfo = null;

    while (true) {
        // check count
        if(count === 5){
            let slackService = SlackService.getInstance();
            await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
         url: ${url}\n
         error: request failed 5 times`);
            break;
        }
        count++;

        try {
            request = await fetch(url, {
                method: "GET"
            });
            // check request body
            if(request.body === null) await new Promise(resolve => setTimeout(resolve, 5000));
            else if(request.body === undefined) await new Promise(resolve => setTimeout(resolve, 5000));
            else if(request.status !== 200) await new Promise(resolve => setTimeout(resolve, 5000));
            else {
                leagueInfo = await request.json();
                break;
            }
        } catch (err) {
            let slackService = SlackService.getInstance();
            await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
         url: ${url}\n
         error: ${err}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    if(leagueInfo === null) continue;
    if(leagueInfo.hasOwnProperty("status")) continue;

    console.log(`request time : ${new Date() - now}`);

    // get model
    let userModel = UserModel;

    // save user info
    if(tier === "CHALLENGER" || tier === "GRANDMASTER" || tier === "MASTER"){
        if(!leagueInfo.hasOwnProperty("entries")) continue;
        let startTimestamp = Date.now();
        let topSaveTime = 0, lowSaveTime = 100000;
        // set leagueInfo
        for(let entry of leagueInfo.entries) {
            let newUserInfo = {
                summonerId: entry.summonerId,
                summonerName: entry.summonerName,
                leaguePoints: entry.leaguePoints,
                rank: entry.rank,
                wins: entry.wins,
                losses: entry.losses,
                veteran: entry.veteran,
                inactive: entry.inactive,
                freshBlood: entry.freshBlood,
                hotStreak: entry.hotStreak,
                tier: leagueInfo.tier,
                leagueId: leagueInfo.leagueId,
                queueType: leagueInfo.queue,
                publish_date: getTodayDate()
            };

            let timestamp = Date.now();

            // save user info
            let user = new userModel(newUserInfo);
            await user.save();

            // calculate save time
            let saveTime = Date.now() - timestamp;

            // calculate top,low save time
            topSaveTime = topSaveTime > saveTime ? topSaveTime : saveTime;
            lowSaveTime = lowSaveTime < saveTime ? lowSaveTime : saveTime;
        }
        console.log(`finish save ${tier}, time: ${Date.now() - startTimestamp}ms, topSaveTime: ${topSaveTime}ms, lowSaveTime: ${lowSaveTime}ms, averageSaveTime: ${(Date.now() - startTimestamp) / leagueInfo.entries.length}ms`);
    }
    else{
        // if leagueInfo is not empty add next page
        if(leagueInfo.length !== 0) {
            let newMessage = {
                type: "settingUserInfo",
                value: {
                    tier: tier,
                    division: division,
                    page: page + 1
                }
            };
            await awsSQSController.sendSQSMessage(sqsURL, newMessage);
        }

        let startTimestamp = Date.now();
        let topSaveTime = 0, lowSaveTime = 0;

        for (let entry of leagueInfo) {
            let newUserInfo = {
                summonerId: entry.summonerId,
                summonerName: entry.summonerName,
                leaguePoints: entry.leaguePoints,
                rank: entry.rank,
                wins: entry.wins,
                losses: entry.losses,
                veteran: entry.veteran,
                inactive: entry.inactive,
                freshBlood: entry.freshBlood,
                hotStreak: entry.hotStreak,
                tier: entry.tier,
                leagueId: entry.leagueId,
                queueType: entry.queueType,
                publish_date: getTodayDate()
            };

            let timestamp = Date.now();

            // save user info
            let user = new userModel(newUserInfo);
            await user.save();

            // calculate save time
            let saveTime = Date.now() - timestamp;
            topSaveTime = topSaveTime > saveTime ? topSaveTime : saveTime;
            lowSaveTime = lowSaveTime < saveTime ? lowSaveTime : saveTime;
        }
        console.log(`finish save tier : ${tier}, division : ${division}, page : ${page}, time: ${Date.now() - startTimestamp}ms, topSaveTime: ${topSaveTime}ms, lowSaveTime: ${lowSaveTime}ms, averageSaveTime: ${(Date.now() - startTimestamp) / leagueInfo.length}ms`);
    }

    // delete message
    await awsSQSController.deleteSQSMessage(sqsURL, message[0].ReceiptHandle);
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

//connection close
await mongoose.disconnect();

//finish process
process.exit(0);