class Duo {

    make(matchInfo){
        let finalResult = [];
        let participants = matchInfo.info.participants;

        for(let first = 0; first < participants.length; first++){
            for(let second = first + 1; second < participants.length; second++){
                let nowResult = {};

                if(participants[first].teamId !== participants[second].teamId) continue;

                nowResult.champion1Id = participants[first].championId;
                nowResult.champion1Name = participants[first].championName;
                nowResult.champion2Id = participants[second].championId;
                nowResult.champion2Name = participants[second].championName;
                nowResult.mainPerk1 = participants[first].perks.styles[0].selections[0].perk;
                nowResult.mainPerk2 = participants[second].perks.styles[0].selections[0].perk;

                let lane1;
                let lane2;
                if(participants[first].individualPosition === participants[first].teamPosition) {
                    lane1 = participants[first].individualPosition;
                }
                else {
                    continue;
                }
                if(participants[second].individualPosition === participants[second].teamPosition) {
                    lane2 = participants[second].individualPosition;
                }
                else {
                    continue;
                }

                nowResult.lane1 = lane1;
                nowResult.lane2 = lane2;

                if(participants[first].win === true){
                    nowResult.win = 1;
                    nowResult.lose = 0;
                }else{
                    nowResult.win = 0;
                    nowResult.lose = 1;
                }

                finalResult.push(nowResult);
            }
        }

        return finalResult;
    }

    /**
     * @return {Duo}
     */
    static getInstance() {
        if(!Duo.instance){
            Duo.instance = new Duo();
        }
        return Duo.instance;
    }
}

export default Duo;