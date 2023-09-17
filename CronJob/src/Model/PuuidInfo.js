import mongoose from "mongoose";

// set schema
const UserInfoSchema = new mongoose.Schema({
    summonerId: {
        type: String,
        required: true,
        primaryKey: true,
    },
    summonerName: {
        type: String,
        required: true,
    },
    leaguePoints: {
        type: Number,
        required: true,
    },
    rank: {
        type: String,
        required: true,
    },
    tier: {
        type: String,
        required: true,
    },
    leagueId: {
        type: String,
        required: true,
    },
    queueType: {
        type: String,
        required: true,
    },
    publish_date: {
        type: String,
        required: true,
    },
    id: {
        type: String,
        required: true,
    },
    accountId: {
        type: String,
        required: true,
    },
    puuid: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    profileIconId: {
        type: Number,
        required: true,
    },
    revisionDate: {
        type: Number,
        required: true,
    },
    summonerLevel: {
        type: Number,
        required: true,
    }
}, {collection: "puuidInfo"});


export default mongoose.model("puuidInfo", UserInfoSchema);