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
    wins: {
        type: Number,
        required: true,
    },
    losses: {
        type: Number,
        required: true,
    },
    veteran: {
        type: Boolean,
        required: true,
    },
    inactive: {
        type: Boolean,
        required: true,
    },
    freshBlood: {
        type: Boolean,
        required: true,
    },
    hotStreak: {
        type: Boolean,
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
        type: String
    },
    accountId: {
        type: String
    },
    puuid: {
        type: String
    },
    name: {
        type: String
    },
    profileIconId: {
        type: Number
    },
    revisionDate: {
        type: Number
    },
    summonerLevel: {
        type: Number
    }
}, {collection: "userInfo"});


export default mongoose.model("userInfo", UserInfoSchema);