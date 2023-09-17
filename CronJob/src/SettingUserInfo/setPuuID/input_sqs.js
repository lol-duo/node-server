import SlackService from "../../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../../SQS/AwsSQSController.js";
import UserModel from "../../Model/UserInfo.js";
import PuuidModel from "../../Model/PuuidInfo.js";
import mongoose from "mongoose";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SetPuuId CronJob is running");
}

// set mongoose
try {
    mongoose.connect(process.env.mongoDB_URI, {
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
let sqsURL = await awsSQSController.get_SQS_URL(process.env.PUUID_SQS_NAME);

// message template
function setMessage(summonerName, summonerId, leaguePoints, rank, tier, leagueId, queueType){
    return {
        value: {
            summonerId: summonerId,
            summonerName: summonerName,
            leaguePoints: leaguePoints,
            rank: rank,
            tier: tier,
            leagueId: leagueId,
            queueType: queueType,
        }
    }
}


// set all summonerName and summonerId
let cursor = null;

while (true) {
    // set cursor
    let query = {};
    if (cursor !== null) query._id = { $gt: cursor };

    // get userInfoList
    let start = Date.now();
    let userInfoList = await UserModel.find(query).select('summonerName summonerId leaguePoints rank tier leagueId queueType').sort({_id: 1}).limit(1000);
    console.log("queryTime: " + (Date.now() - start) + "ms");

    // check userInfoList
    if (userInfoList.length === 0) break;

    let setMessageTime = Date.now();
    // set SQS message
    let sqsMessageList = [];
    for(let userInfo of userInfoList){
        let puuid = await PuuidModel.findOne({summonerId: userInfo.summonerId});
        if(puuid === null) sqsMessageList.push(setMessage(userInfo.summonerName, userInfo.summonerId, userInfo.leaguePoints, userInfo.rank, userInfo.tier, userInfo.leagueId, userInfo.queueType));
    }
    console.log("setMessageTime: " + (Date.now() - setMessageTime) + "ms");

    // set cursor
    cursor = userInfoList[userInfoList.length - 1]._id;

    // send SQS message
    await awsSQSController.sendSQSMessage(sqsURL, sqsMessageList);
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);