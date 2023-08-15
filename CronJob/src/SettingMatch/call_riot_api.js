import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../SQS/AwsSQSController.js";
import fetch from "node-fetch";
import {MongoClient} from "mongodb";


// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "Add Match CronJob is running");
}

let matchCollection = null;
let matchTimeLineCollection = null;

// set mongoose
try {
    const client = new MongoClient(process.env.mongoDB_URI, { useUnifiedTopology: true });
    await client.connect();

    const database = client.db("riot");
    matchCollection = database.collection("match");
    matchTimeLineCollection = database.collection("matchTimeLine");

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

while (true){
    // get SQS message
    let message = await awsSQSController.getSQSMessage(sqsURL, 3600, 20, 1);
    if(message === null) break;

    // parse message
    let messageBody = JSON.parse(message[0].Body);

    for(let i = 0; i < messageBody.length; i++){
        // get matchId
        let matchId = messageBody[i].value.matchId;

        let matchURL = `${process.env.RIOT_SERVICE_URL}/matches/${matchId}`;
        let matchTimeLineURL = `${process.env.RIOT_SERVICE_URL}/matches/${matchId}/timeline`;

        // get league
        let request; let count = 0; let now = new Date(); let matchInfo = null;

        while (true) {
            // check count
            if(count === 5){
                let slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${matchURL}\n
             error: request failed 5 times`);
                break;
            }
            count++;

            try {
                request = await fetch(matchURL, {
                    method: "GET"
                });
                // check request body
                if(request.body === null) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.body === undefined) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.status !== 200) {
                    if(request.status === 404 && request.body.status.message === "Data not found - match file not found"){
                        matchInfo = null;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                else {
                    matchInfo = await request.json();
                    break;
                }
            } catch (err) {
                let slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${matchURL}\n
             error: ${err}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if(matchInfo === null) continue;

        console.log(`request time : ${new Date() - now}`);


        let matchTimeLine = null;

        while (true) {
            // check count
            if(count === 5){
                let slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${matchTimeLineURL}\n
             error: request failed 5 times`);
                break;
            }
            count++;

            try {
                request = await fetch(matchTimeLineURL, {
                    method: "GET"
                });
                // check request body
                if(request.body === null) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.body === undefined) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.status !== 200) {
                    if(request.status === 404 && request.body.status.message === "Data not found - match file not found"){
                        matchTimeLine = null;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                else {
                    matchTimeLine = await request.json();
                    break;
                }
            } catch (err) {
                let slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${matchTimeLineURL}\n
             error: ${err}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if(matchTimeLine === null) continue;

        console.log(`request time : ${new Date() - now}`);

        let dbStartTime = Date.now();
        // insert matchInfo
        matchCollection.insertOne(matchInfo);
        matchTimeLineCollection.insertOne(matchTimeLine);
        console.log(`db insert time : ${Date.now() - dbStartTime}ms`);
    }

    // delete message
    await awsSQSController.deleteSQSMessage(sqsURL, message[0].ReceiptHandle);
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished");
}

//finish process
process.exit(0);