import SlackService from "../../Slack/SlackService.js";
import dotenv from "dotenv";
import AwsSQSController from "../../SQS/AwsSQSController.js";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob SQS_INPUT is running");
}

// get SQS URL
let awsSQSController = AwsSQSController.getInstance();
let sqsURL = await awsSQSController.get_SQS_URL(process.env.SQS_NAME);

// message template
function setMessage(tier, division = "I"){
    return {
        value: {
            tier: tier,
            division: division,
            page: 1
        }
    }
}

// set Challenger
let message = setMessage("CHALLENGER");
await awsSQSController.sendSQSMessage(sqsURL, message);

if(process.env.TIER === "CHALLENGER") {
    await done();
    process.exit(0);
}

// set GrandMaster
message = setMessage("GRANDMASTER");
await awsSQSController.sendSQSMessage(sqsURL, message);

if(process.env.TIER === "GRANDMASTER") {
    await done();
    process.exit(0);
}

// set Master
message = setMessage("MASTER");
await awsSQSController.sendSQSMessage(sqsURL, message);

if(process.env.TIER === "MASTER") {
    await done();
    process.exit(0);
}


let tierList = ["DIAMOND","EMERALD", "PLATINUM", "GOLD", "SILVER", "BRONZE", "IRON"];
let divisionList = ["I", "II", "III", "IV"];

// set all tier and division
for(let tier of tierList){
    for(let division of divisionList){
        let message = setMessage(tier, division);
        await awsSQSController.sendSQSMessage(sqsURL, message);

        if(process.env.TIER === tier && process.env.DIVISION === division) {
            await done();
            process.exit(0);
        }
    }
}
await done();

async function done() {
// send Slack message if MODE is prod
    if (process.env.MODE === "prod") {
        const slackService = SlackService.getInstance();
        await slackService.sendMessage(process.env.Slack_Channel, "SettingUserInfo CronJob SQS_INPUT is finished");
    }
}