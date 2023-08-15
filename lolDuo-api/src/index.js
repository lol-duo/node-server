import LeagueController from "./controller/LeagueController.js";
import SlackService from "./service/slack.js";
import dotenv from "dotenv";
import express from "express";
import ServerInfoController from "./controller/ServerInfo.js";
import SummonerController from "./controller/SummonerController.js";
import MatchController from "./controller/MatchController.js";

if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}
if(process.env.MODE === "prod"){
    console.log("lol-duo api server is running");
    const slackService = SlackService.getInstance();
    slackService.sendMessage(process.env.Slack_Channel, "lol-duo api server is running");
}

const leagueController = new LeagueController();
const serverController = new ServerInfoController();
const summonerController = new SummonerController();
const matchController = new MatchController();

let app = new express();
app.use("/" , leagueController.getRouter());
app.use("/", serverController.getRouter());
app.use("/", summonerController.getRouter());
app.use("/", matchController.getRouter());

//health check
app.get('/health', (req, res) => {
    res.send("lol-duo api server is running");
});

app.listen(process.env.PORT, () => {
    console.log(`lol-duo api server is running on port ${process.env.PORT}`);
    console.log(`riot api key : ${process.env.Riot_API_Key}`);
    console.log(`slack token : ${process.env.Slack_Bot_Token}`);
    console.log(`slack channel : ${process.env.Slack_Channel}`);
    console.log(`wait time : ${process.env.WAIT_TIME}`);
});