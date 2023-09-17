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
    collection = database.collection("userInfo");

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
let tierList = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND","AM", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"];

while (true){
    let puuIdList = await collection.find({ "puuId": { $exists: true }}).sort({'puuid': 1}).project({"puuid":1, _id:0}).limit(1000).toArray();
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);