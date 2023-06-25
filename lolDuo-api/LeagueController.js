import express from "express";
import Service from "./service.js";
class LeagueController {
    constructor() {
        this.app = express();
        this.service = new Service();

        //get challenger league
        this.app.get('/challengerLeague', async (req, res) => {
            res.send(await this.service.getChallengerLeague());
        });

        //get grandmaster league
        this.app.get('/grandmasterLeague', async (req, res) => {
            res.send(await this.service.getGrandmasterLeague());
        });

        //get master league
        this.app.get('/masterLeague', async (req, res) => {
            res.send(await this.service.getMasterLeague());
        });

        //get league by tier and division
        this.app.get('/league/:tier/:division/:page', async (req, res) => {
            const tier = req.params.tier;
            const division = req.params.division;
            const page = req.params.page;
            res.send(await this.service.getLeagueByTierAndDivision(tier, division, page));
        });

        this.app.listen(3000, () => {
            console.log('Example app listening on port 3000!');
        });
    }
}

export default LeagueController;