import fetch from 'node-fetch';
import { Mutex } from 'async-mutex';

class Service {
    constructor() {
        //set headers
        this.headers = {
            "X-Riot-Token": ""
        }

        //set timer
        this.timer = 0;

        //set mutex
        this.mutex = new Mutex();
    }

    //get response from url
    async getResponse(url) {

        //5 requests per second
        const mutex = await this.mutex.acquire();
        const timer = this.timer;
        const now = Date.now();

        //wait if necessary
        if (now - timer < 200) await new Promise(resolve => setTimeout(resolve, 200 - (now - timer)));
        try {
            //get response
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            })
            const json = await response.json();

            //update timer
            this.timer = Date.now();

            //return json
            return json;
        } catch (err) {
            return err;
        } finally {
            //release mutex
            mutex();
        }
    }

    //get challenger league
    async getChallengerLeague() {
        const url = 'https://kr.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5';
        return await this.getResponse(url);
    }

    //get grandmaster league
    async getGrandmasterLeague() {
        const url = 'https://kr.api.riotgames.com/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5';
        return await this.getResponse(url);
    }

    //get master league
    async getMasterLeague() {
        const url = 'https://kr.api.riotgames.com/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5';
        return await this.getResponse(url);
    }

    //get league by tier and division
    async getLeagueByTierAndDivision(tier, division,page) {
        const url = `https://kr.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=${page}`;
        return await this.getResponse(url);
    }
}

export default Service;