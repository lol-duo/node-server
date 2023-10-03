import mongoose from "mongoose";

// set schema
const MatchListSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
    },
    matchInfoDone: {
        type: Boolean,
        required: true,
    },
    matchTimelineDone: {
        type: Boolean,
        required: true,
    }
}, {collection: "matchList"});


export default mongoose.model("matchList", MatchListSchema);