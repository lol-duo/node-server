import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../SQS/AwsSQSController.js";
import fetch from "node-fetch";
import {MongoClient} from "mongodb";


// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    console.log("dev");
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingMatchInfo call api CronJob is running");
}

let matchCollection = null;
let matchListCollection = null;
let client = null;

// set mongoose
try {
    console.log(process.env.mongoDB_URI);
    client = new MongoClient(process.env.mongoDB_URI);
    await client.connect();

    const database = client.db("riot");
    matchCollection = database.collection("matchInfo");
    matchListCollection = database.collection("matchList");
    if(matchCollection === null) {
        const slackService = SlackService.getInstance();
        await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: matchCollection is null`);

        //finish process
        process.exit(1);
    }

} catch (err) {
    // send Slack message
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, `error: ${err}`);

    //finish process
    process.exit(1);
}

// get SQS URL
let awsSQSController = AwsSQSController.getInstance();
let sqsURL = await awsSQSController.get_SQS_URL(process.env.MATCHINFO_SQS_NAME);
let totalSaveCount = 0;

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

        if(matchInfo === null) {
            console.log(`request time : ${new Date() - now} && skip (matchInfo === null)`);
            continue;
        }
        if(matchInfo.hasOwnProperty("status")){
            console.log(`request time : ${new Date() - now} && skip (matchInfo.hasOwnProperty("status"))`);
            continue;
        }

        console.log(`request time : ${new Date() - now}`);

        let dbStartTime = Date.now();
        // insert matchInfo
        // start transaction

        const session = client.startSession();
        session.startTransaction();
        try {
            await matchCollection.insertOne(matchInfo, {session: session});

            // update matchList
            let matchListInfo = await matchListCollection.findOne({matchId: matchId}, {session: session});
            matchListInfo.matchInfoDone = true;
            await matchListCollection.replaceOne({matchId: matchId}, matchListInfo, {session: session});

            await session.commitTransaction();
            session.endSession();
        } catch (err) {

            await session.abortTransaction();
            session.endSession();

            // send Slack message
            const slackService = SlackService.getInstance();
            await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: ${err}`);

            continue;
        } finally {
            totalSaveCount++;
        }
        console.log(`db insert time : ${Date.now() - dbStartTime}ms`);
    }

    // delete message
    await awsSQSController.deleteSQSMessage(sqsURL, message[0].ReceiptHandle);
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is finished \n totalSaveCount: " + totalSaveCount);
}

//finish process
process.exit(0);