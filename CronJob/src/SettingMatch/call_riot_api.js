import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../SQS/AwsSQSController.js";
import fetch from "node-fetch";
import mongoose from "mongoose";
import MatchList from "../Model/MatchList.js";


// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "Add Match CronJob is running");
}

// set mongoose
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
let sqsURL = await awsSQSController.get_SQS_URL(process.env.MATCH_SQS_NAME);
let totalSaveCount = 0;

while (true){
    // get SQS message
    let message = await awsSQSController.getSQSMessage(sqsURL, 3600, 20, 1);
    if(message === null) break;

    // parse message
    let messageBody = JSON.parse(message[0].Body);

    for(let i = 0; i < messageBody.length; i++){
        // get puuid
        let puuid = messageBody[i].value.puuid;

        let matchListURL = `${process.env.RIOT_SERVICE_URL}/matches/by-puuid/${puuid}`;

        // get matchList
        let request; let count = 0; let now = new Date(); let matchListInfo = null;

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
                request = await fetch(matchListURL, {
                    method: "GET"
                });
                // check request body
                if(request.body === null) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.body === undefined) await new Promise(resolve => setTimeout(resolve, 5000));
                else if(request.status !== 200) {
                    if(request.status === 404 && request.body.status.message === "Data not found - match file not found"){
                        matchListInfo = null;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                else {
                    matchListInfo = await request.json();
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

        if(matchListInfo === null) {
            console.log(`request time : ${new Date() - now} && skip (matchInfo === null)`);
            continue;
        }

        console.log(`request time : ${new Date() - now}`);

        let dbStartTime = Date.now();
        for(let match of matchListInfo){
            let isExist = await MatchList.exists({matchId: match});

            if(isExist) continue;

            let matchList = new MatchList({
                matchId: match,
                matchInfoDone: false,
                matchTimelineDone: false
            });

            await matchList.save();
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