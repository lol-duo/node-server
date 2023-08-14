import SlackService from "../../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../../SQS/AwsSQSController.js";
import fetch from "node-fetch";
import mongoose from "mongoose";
import UserModel from "../../Model/UserInfo.js";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob is running");
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
let sqsURL = await awsSQSController.get_SQS_URL(process.env.PUUID_SQS_NAME);

while (true){
    // get SQS message
    let message = await awsSQSController.getSQSMessage(sqsURL, 3600, 20, 1);
    if(message === null) break;

    // parse message
    let messageBody = JSON.parse(message[0].Body);

    // get summoner by summonerId
    for(let i = 0; i < messageBody.length; i++){
        let url = `${process.env.RIOT_SERVICE_URL}/summoner/${messageBody[i].value.summonerId}`;
        let count = 0; let summonerInfo = null; let startTime = Date.now();
        while (true) {

            // check count
            if (count === 5) {
                let slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${url}\n
             error: request failed 5 times`);
                process.exit(1);
            }
            count++;

            // fetch
            try {
                let request = await fetch(url, {
                    method: "GET"
                });

                if (request.body === null) await new Promise(resolve => setTimeout(resolve, 5000));
                else if (request.body === undefined) await new Promise(resolve => setTimeout(resolve, 5000));
                else if (request.status !== 200) await new Promise(resolve => setTimeout(resolve, 5000));
                else {
                    summonerInfo = await request.json();
                    console.log(`request time: ${Date.now() - startTime}ms`);
                    break;
                }
            } catch (err) {
                // send Slack message
                const slackService = SlackService.getInstance();
                await slackService.sendMessage(process.env.Slack_Channel, `SettingUserInfo CronJob is failed\n
             url: ${url}\n
             error: ${err}`);
            }
        }

        let dbStartTIme = Date.now();

        // get user by summonerId
        let user = await UserModel.findOne({summonerId: summonerInfo.id});
        if(user === null) continue;

        // check db time
        console.log(`db query time: ${Date.now() - dbStartTIme}`);
        dbStartTIme = Date.now();

        // update user
        user.accountId = summonerInfo.accountId;
        user.profileIconId = summonerInfo.profileIconId;
        user.revisionDate = summonerInfo.revisionDate;
        user.summonerLevel = summonerInfo.summonerLevel;
        user.name = summonerInfo.name;
        user.puuid = summonerInfo.puuid;
        await user.save();

        // check db time
        console.log(`db save time: ${Date.now() - dbStartTIme}`);
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