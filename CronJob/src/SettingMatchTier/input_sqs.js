import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../SQS/AwsSQSController.js";
import {MongoClient} from "mongodb";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SetPuuId CronJob is running");
}

let collection;

// set mongoose
try {
    const client = new MongoClient(process.env.mongoDB_URI, { useUnifiedTopology: true });
    await client.connect();

    const database = client.db("riot");
    collection = database.collection("match");

} catch (err) {
    // send Slack message
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: ${err}`);

    //finish process
    process.exit(1);
}

// get SQS URL
let awsSQSController = AwsSQSController.getInstance();
let sqsURL = await awsSQSController.get_SQS_URL(process.env.MATCH_TIER_SQS_NAME);

// message template
function setMessage(matchId){
    return {
        value: {
            matchId: matchId
        }
    }
}

// get userInfoList
let start = Date.now();
let currentMatch = await collection.find({ "metadata.avgTier": { $exists: false }}).sort({'metadata.matchId': 1}).project({"metadata.matchId":1, _id:0}).limit(1000).toArray();
console.log("queryTime: " + (Date.now() - start) + "ms");

// get matchIdList
let messageList = [];
while (true){
    if(currentMatch.length === 0) break;

    for (let i = 0; i < currentMatch.length; i++) {
        messageList.push(setMessage(currentMatch[i].metadata.matchId));
    }
    await awsSQSController.sendSQSMessage(sqsURL, messageList);
    let lastMatchId = currentMatch[currentMatch.length - 1].metadata.matchId;
    currentMatch = await collection.find({ "metadata.avgTier": { $exists: false }, "metadata.matchId": {$gt: lastMatchId}}).sort({'metadata.matchId': 1}).project({"metadata.matchId":1, _id:0}).limit(1000).toArray();
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);