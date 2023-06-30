import express from "express";
import Service from "../service/service.js";

class LeagueController {
    constructor() {

        let router = express.Router();
        let service = new Service();

        //get challenger league
        router.get('/challengerLeague', async (req, res) => {
            res.send(await service.getChallengerLeague());
        });

        //get grandmaster league
        router.get('/grandmasterLeague', async (req, res) => {
            res.send(await service.getGrandmasterLeague());
        });

        //get master league
        router.get('/masterLeague', async (req, res) => {
            res.send(await service.getMasterLeague());
        });

        //get league by tier and division
        router.get('/league/:tier/:division/:page', async (req, res) => {
            const tier = req.params.tier;
            const division = req.params.division;
            const page = req.params.page;
            res.send(await service.getLeagueByTierAndDivision(tier, division, page));
        });

        this.router = router;
    }

    getRouter(){
        return this.router;
    }
}


export default LeagueController;