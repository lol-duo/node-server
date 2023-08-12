import express from "express";
import Service from "../service/service.js";

class SummonerController {
    constructor() {

        let router = express.Router();
        let service = Service.getInstance();

        //get summoner by summoner name
        router.get('/summoner/by-name/:summonerName', async (req, res) => {
            const summonerName = req.params.summonerName;
            res.send(await service.getSummonerBySummonerName(summonerName));
        });

        //get summoner by summoner id
        router.get('/summoner/:summonerId', async (req, res) => {
            const summonerId = req.params.summonerId;
            res.send(await service.getSummonerBySummonerId(summonerId));
        });

        this.router = router;
    }

    getRouter(){
        return this.router;
    }
}


export default SummonerController;