import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import fetch from "node-fetch";

// set dotenv if MODE is dev
if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}

const timePerSecond = Number(process.env.TIME_PER_SECOND) || 3600;

let response = await fetch(process.env.RIOT_SERVICE_URL + "/apiCallCount");
await fetch(process.env.RIOT_SERVICE_URL + "/resetApiCallCount");
let json = await response.json();
let apiCallCount = json.count;

// send Slack message
const slackService = SlackService.getInstance();
await slackService.sendMessage(process.env.Slack_Channel, `현재 Riot-api-server는 ${timePerSecond}초 당 ${apiCallCount}개의 API를 호출하고 있습니다. 평균 : ${apiCallCount / timePerSecond}개/초`);
