import {WebClient} from "@slack/web-api";

class SlackService{
    constructor() {
        const slackToken = process.env.Slack_Bot_Token;
        this.web = new WebClient(slackToken);
    }

    sendMessage(channel, text){
        this.web.chat.postMessage({
            channel: channel,
            text: text
        });
    }

    /**
     * singleton
     * @returns {SlackService}
     */
    static getInstance(){
        if(!SlackService.instance){
            SlackService.instance = new SlackService();
        }
        return SlackService.instance;
    }
}

export default SlackService;