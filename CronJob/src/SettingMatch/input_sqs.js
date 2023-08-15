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
let sqsURL = await awsSQSController.get_SQS_URL(process.env.MATCH_SQS_NAME);

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
let currentMatch = await collection.find({}).sort({'metadata.matchId': -1}).limit(1).toArray();
console.log("queryTime: " + (Date.now() - start) + "ms");

let startMatchId;
// check userInfoList
if (currentMatch.length === 0) {
    startMatchId = "KR_6650978642";
}else {
    startMatchId = currentMatch[0].metadata.matchId;
}

let startMatchIdInt = parseInt(startMatchId.split("_")[1]);
let endMatchIdInt = startMatchIdInt + parseInt(process.env.MATCH_COUNT);

// get matchIdList
let messageList = [];
let count = 1;
for(let i = startMatchIdInt; i < endMatchIdInt; i++){
    if(count % 1000 === 0) {
        await awsSQSController.sendSQSMessage(sqsURL, messageList);
        messageList = [];
    }
    messageList.push(setMessage("KR_" + i));
    count++;
}
await awsSQSController.sendSQSMessage(sqsURL, messageList);


// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);