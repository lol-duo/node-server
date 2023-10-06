import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../SQS/AwsSQSController.js";
import MatchList from "../Model/MatchList.js";
import mongoose from "mongoose";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SetMatchInfo SQS INPUT is running");
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
let sqsURL = await awsSQSController.get_SQS_URL(process.env.MATCHINFO_SQS_NAME);

// message template
function setMessage(matchId, matchInfoDone, matchTimelineDone){
    return {
        value: {
            matchId: matchId,
            matchInfoDone: matchInfoDone,
            matchTimelineDone: matchTimelineDone
        }
    }
}

// get matchIdList
let cursor = null;
let time = Number(process.env.TIME);
console.log(time + " hour start");

for(let i = 0; i < time; i++){

    // 시간당 처리할 수 있는 양으로 제한
    let bulkSize = 1000;
    let count = 5*60*60 / bulkSize;
    for(let j = 0; j < count; j++){
        // matchInfoDone false or matchTimelineDone false
        let filter = {matchInfoDone: false};
        if(cursor !== null) filter._id = {$gt: cursor};
        let matchIdList = await MatchList.find(filter).sort({_id: 1}).limit(bulkSize).toArray();
        if(matchIdList.length === 0) break;

        // send SQS message
        let messageList = [];
        for(let i = 0; i < matchIdList.length; i++){
            messageList.push(setMessage(matchIdList[i].matchId, matchIdList[i].matchInfoDone, matchIdList[i].matchTimelineDone));
        }
        await awsSQSController.sendSQSMessage(sqsURL, messageList);

        // set cursor
        cursor = matchIdList[matchIdList.length - 1]._id;

        // print count
        count += matchIdList.length;
        console.log(count);
    }
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);