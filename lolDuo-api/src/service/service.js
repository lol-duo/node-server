import fetch from 'node-fetch';
import {Mutex} from 'async-mutex';
import SlackService from "./slack.js";

class Service {
    constructor() {
        //set headers
        this.headers = {
            "X-Riot-Token": process.env.Riot_API_Key
        }

        //set timer
        this.waitCountPerSecond = Number(process.env.WAIT_COUNT_PER_SECOND) || 5;
        this.timer = new Array(this.waitCountPerSecond).fill(0);
        this.timerCount = 0;

        //set mutex
        this.mutex = new Mutex();

        //set call count
        this.callCount = 0;
    }

    async checkTimer() {

        //acquire mutex
        const mutex = await this.mutex.acquire();

        // compare requests per second
        const compareTime = (this.timerCount + this.waitCountPerSecond) % this.waitCountPerSecond;

        //wait if necessary
        if (Date.now() - this.timer[compareTime] < 1000) await new Promise(resolve => setTimeout(resolve, 1000 - (Date.now() - this.timer[compareTime])));

        //set timer
        this.timer[this.timerCount] = Date.now();
        this.timerCount = (this.timerCount + 1) % this.waitCountPerSecond;

        //release mutex
        mutex();
    }


    //get call count
    getCallCount() {
        return this.callCount;
    }

    //reset call count
    resetCallCount() {
        this.callCount = 0;
    }

    //get response from url
    async getResponse(url) {

        const now = Date.now();

        try {
            let count = 0;
            while (true) {
                //wait if necessary
                await this.checkTimer();

                //check count
                if (count++ > 5) {
                    //send Slack message
                    SlackService.getInstance().sendMessage(process.env.Slack_Channel,
                        `lol-duo-api Service/getResponse Riot 요청 오류 발생 : 
                    url : ${url}
                    count : ${count}
                    riot api key : ${process.env.Riot_API_Key}`);
                    return null;
                }

                //increase call count
                this.callCount++;

                //get response
                const response = await fetch(url, {
                    method: 'GET',
                    headers: this.headers
                })

                //check response
                if (!response.ok) continue;

                //return json
                return await response.json();
            }
        } catch (err) {
            SlackService.getInstance().sendMessage(process.env.Slack_Channel, `lol-duo-api Service/getResponse error 발생 : ${err}`);
            return null;
        } finally {
            console.log(`lol-duo-api Service/getResponse : ${Date.now() - now}ms`);
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

    //get summoner by summoner name
    async getSummonerBySummonerName(summonerName) {
        const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURI(summonerName)}`;
        return await this.getResponse(url);
    }

    //get summoner by summoner id
    async getSummonerBySummonerId(summonerId) {
        const url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}`;
        return await this.getResponse(url);
    }

    //get match info by match id
    async getMatchInfoByMatchId(matchId) {
        let url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        if(matchId[0] === 'K' && matchId[1] === 'R') url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`;

        return await this.getResponse(url);
    }

    //get match timeline by match id
    async getMatchTimelineByMatchId(matchId) {
        let url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
        if(matchId[0] === 'K' && matchId[1] === 'R') url = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;

        return await this.getResponse(url);
    }

    /**
     * singleton
     * @returns {Service}
     */
    static getInstance() {
        if (!Service.instance) {
            Service.instance = new Service();
        }
        return Service.instance;
    }
}

export default Service;