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
    }
});

// set model
function getModel(collectionName) {
    return mongoose.model(collectionName, UserInfoSchema, collectionName);
}

export default getModel;