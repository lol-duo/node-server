import express from "express";
import Service from "../service/service.js";

class MatchController {
    constructor() {

        let router = express.Router();
        let service = Service.getInstance();

        //get match list by puuid
        router.get('/matches/by-puuid/:puuid', async (req, res) => {
            const puuid = req.params.puuid;
            res.send(await service.getMatchListByPuuid(puuid));
        });
        //get challenger league
        router.get('/matches/:id', async (req, res) => {
            const matchId = req.params.id;
            res.send(await service.getMatchInfoByMatchId(matchId));
        });

        //get league by tier and division
        router.get('/matches/:id/timeline', async (req, res) => {
            const matchId = req.params.id;
            res.send(await service.getMatchTimelineByMatchId(matchId));
        });

        this.router = router;
    }

    getRouter(){
        return this.router;
    }
}


export default MatchController;