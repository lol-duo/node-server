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
    console.log(process.env.mongoDB_URI);
    const client = new MongoClient(process.env.mongoDB_URI, { useUnifiedTopology: true });
    await client.connect();

    const database = client.db("riot");
    collection = database.collection("puuidInfo");

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
function setMessage(puuid){
    return {
        value: {
            puuid: puuid
        }
    }
}

// get userInfoList
let cursor = null;
let tierList = ["CHALLENGER", "GRANDMASTER", "MASTER", "DIAMOND", "EMERALD", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"];

for(let i = 0; i < tierList.length; i++) {
    console.log(tierList[i] + " start");

    let count = 0;

    while(true) {
        let filter = {};
        let messageList = [];
        if (cursor !== null) filter = {"puuid": {$gt: cursor}, "tier": tierList[i]};
        else filter = {"tier": tierList[i]};

        let puuIdList = await collection.find(filter).sort({puuid: 1}).limit(1000).toArray();
        if (puuIdList.length === 0) break;

        for (let j = 0; j < puuIdList.length; j++) {
            messageList.push(setMessage(puuIdList[j].puuid));
        }
        count++;
        await awsSQSController.sendSQSMessage(sqsURL, messageList);
        cursor = puuIdList[puuIdList.length - 1].puuid;
    }
    console.log(tierList[i] + " end " + count + " times");
    cursor = null;
    if(tierList[i] === process.env.TIER) break;
}


// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

process.exit(0);