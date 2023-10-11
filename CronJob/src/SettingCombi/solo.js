class Solo {

    make(matchInfo){
        let finalResult = [];
        let participants = matchInfo.info.participants;

        for(let participant of participants){
            let nowResult = {};

            nowResult.championId = participant.championId;
            nowResult.championName = participant.championName;
            nowResult.mainPerk = participant.perks.styles[0].selections[0].perk;

            let lane;
            if(participant.individualPosition === participant.teamPosition) {
                lane = participant.individualPosition;
            } else {
                continue;
            }

            nowResult.lane = lane;
            if(participant.win === true){
                nowResult.win = 1;
                nowResult.lose = 0;
            }
            else {
                nowResult.win = 0;
                nowResult.lose = 1;
            }

            finalResult.push(nowResult);
        }

        return finalResult;
    }

    /**
     * @return {Solo}
     */
    static getInstance() {
        if(!Solo.instance){
            Solo.instance = new Solo();
        }
        return Solo.instance;
    }
}

export default Solo;