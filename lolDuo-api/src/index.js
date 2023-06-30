import LeagueController from "./controller/LeagueController.js";
import SlackService from "./service/slack.js";
import dotenv from "dotenv";
import express from "express";

if(process.env.MODE === "dev"){
    dotenv.config({path: process.env.npm_config_local_prefix + "/secret/secret.env"});
}
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    slackService.sendMessage(process.env.Slack_Channel, "lol-duo api server is running");
}

const controller = new LeagueController();

let app = new express();
app.use("/" , controller.getRouter());

//health check
app.get('/health', (req, res) => {
    res.send("lol-duo api server is running");
});

app.listen(process.env.PORT, () => {
    console.log(`lol-duo api server is running on port ${process.env.PORT}`);
});