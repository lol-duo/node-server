import SlackService from "../Slack/SlackService.js";
import dotenv from "dotenv";
import {MongoClient} from "mongodb";
import Solo from "./solo.js";
import Duo from "./duo.js";


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
let client = null;
let database = null;
let lolDuoDatabase = null;
let soloCollection = null;
let duoCollection = null;

// set mongoose
try {
    console.log(process.env.mongoDB_URI);
    client = new MongoClient(process.env.mongoDB_URI);
    await client.connect();

    database = client.db("riot");
    lolDuoDatabase = client.db("lolDuo");
    matchCollection = database.collection("matchInfo");
    soloCollection = lolDuoDatabase.collection("solo");
    duoCollection = lolDuoDatabase.collection("duo");

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

let totalSaveCount = 0;

let solo = Solo.getInstance();
let duo = Duo.getInstance();

let totalStart = new Date();

while (true){

    let filter = {done : {$exists: false}};
    let projection = {
        'info.gameMode': 1,
        'info.gameType': 1,
        'info.queueId': 1,
        'info.mapId': 1,
        'info.gameVersion': 1,
        'info.participants.individualPosition': 1,
        'info.participants.teamPosition': 1,
        'info.participants.championId': 1,
        'info.participants.championName': 1,
        'info.participants.perks.styles.selections.perk': 1,
        'info.participants.win': 1,
        'info.participants.teamId': 1,
    };
    let matchInfoList = await matchCollection.findOne(filter, {projection: projection});

    if(matchInfoList === null) break;

    totalSaveCount++;
    if(totalSaveCount % 100 === 0) {
        console.log(totalSaveCount + " " + (new Date() - totalStart));
        totalStart = new Date();
    }

    // transaction
    let session = client.startSession();
    session.startTransaction();

    try {
        let version = matchInfoList.info.gameVersion.split(".");
        version = version[0] + "." + version[1];
        let gameType = {
            gameMode: matchInfoList.info.gameMode,
            gameType: matchInfoList.info.gameType,
            queueId: matchInfoList.info.queueId,
            mapId: matchInfoList.info.mapId,
            version: version
        }
        // solo
        let soloResult = solo.make(matchInfoList);
        let soloStart = new Date();

        for (let j = 0; j < soloResult.length; j++) {
            let soloInfo = await soloCollection.findOne({
                championId: soloResult[j].championId,
                lane: soloResult[j].lane,
                mainPerk: soloResult[j].mainPerk,
                ...gameType
            });
            if (soloInfo === null) {
                soloResult[j] = {...soloResult[j], ...gameType};
                await soloCollection.insertOne(soloResult[j]);
            } else {
                let win = soloInfo.win + soloResult[j].win;
                let lose = soloInfo.lose + soloResult[j].lose;
                await soloCollection.updateOne({
                    championId: soloResult[j].championId,
                    lane: soloResult[j].lane,
                    mainPerk: soloResult[j].mainPerk,
                    ...gameType
                }, {$set: {win: win, lose: lose}});
            }
        }

        let time = new Date() - soloStart;
        if(time > 500) console.log("solo: " + time);

        // duo
        let duoResult = duo.make(matchInfoList);
        let duoStart = new Date();

        for (let j = 0; j < duoResult.length; j++) {
            let champ1 = [duoResult[j].champion1Id, duoResult[j].mainPerk1, duoResult[j].lane1].sort().join("");
            let champ2 = [duoResult[j].champion2Id, duoResult[j].mainPerk2, duoResult[j].lane2].sort().join("");

            let gameTypeHash = [gameType.gameMode, gameType.gameType, gameType.queueId, gameType.mapId, gameType.version].sort().join("");
            let duoHash = [champ1, champ2, gameTypeHash].sort().join("");

            let duoInfo = await duoCollection.findOne({duoHash: duoHash});

            if (duoInfo === null) {
                duoResult[j] = {...duoResult[j], ...gameType, duoHash: duoHash};
                await duoCollection.insertOne(duoResult[j]);
            } else {
                let win = duoInfo.win + duoResult[j].win;
                let lose = duoInfo.lose + duoResult[j].lose;
                await duoCollection.updateOne({duoHash: duoHash}, {$set: {win: win, lose: lose}});
            }
        }

        time = new Date() - duoStart;
        if(time > 500) console.log("duo: " + time);

        await matchCollection.updateOne({_id: matchInfoList._id}, {$set: {done: true}});
        await session.commitTransaction();
        session.endSession();

    } catch (err) {

        await session.abortTransaction();
        session.endSession();

        // send Slack message
        const slackService = SlackService.getInstance();
        await slackService.sendMessage(process.env.Slack_Channel, `mongoose error: ${err}`);
    }

}

// send Slack message if MODE is prod
if(process.env.MODE === "prod"){
    const slackService = SlackService.getInstance();
    await slackService.sendMessage(process.env.Slack_Channel, "SettingCombi CronJob is finished \n totalSaveCount: " + totalSaveCount);
}

//finish process
process.exit(0);