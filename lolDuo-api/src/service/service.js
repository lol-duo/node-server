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
        this.timer = 0;
        this.waitTime = Number(process.env.WAIT_TIME) || 200;

        //set mutex
        this.mutex = new Mutex();

        //set call count
        this.callCount = 0;
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

        //5 requests per second
        const mutex = await this.mutex.acquire();
        const timer = this.timer;
        const now = Date.now();

        try {
            let count = 0;
            while (true) {
                //wait if necessary
                if (now - timer < this.waitTime) await new Promise(resolve => setTimeout(resolve, this.waitTime - (now - timer)));

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

                //update timer
                this.timer = Date.now();

                //check response
                if (!response.ok) {
                    console.log(JSON.stringify(response))
                    //send Slack message
                    SlackService.getInstance().sendMessage(process.env.Slack_Channel,
                        `lol-duo-api Service/getResponse Riot 응답 오류 발생 : 
                    url : ${url}
                    status : ${response.status} 
                    statusText : ${response.statusText}
                    count : ${count}
                    riot api key : ${process.env.Riot_API_Key}`);
                    continue;
                }

                //return json
                return await response.json();
            }
        } catch (err) {
            SlackService.getInstance().sendMessage(process.env.Slack_Channel, `lol-duo-api Service/getResponse error 발생 : ${err}`);
            return null;
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