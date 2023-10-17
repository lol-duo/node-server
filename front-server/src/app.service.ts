import { Injectable } from '@nestjs/common';
import {MongoClient} from "mongodb";

let matchCollection = null;
let client = null;

// set mongoose
try {
    console.log(process.env.mongoDB_URI);
    client = new MongoClient(process.env.mongoDB_URI);
    // @ts-ignore
    client.connect();

    const database = client.db("lolDuo");
    matchCollection = database.collection("solo");

} catch (err) {
    console.log(err);

    //finish process
    process.exit(1);
}

@Injectable()
export class AppService {

  async getSoloInfo(championId: string, position: string, version: string = "13.17"): Promise<any> {

      console.log(championId, position, version);
      let chpId = parseInt(championId);

      let query = {
          championId: chpId,
          lane: position,
          gameMode: "CLASSIC",
          gameType: "MATCHED_GAME",
          queueId: 420,
          mapId: 11,
          version: version,
      };

      if(chpId === 0) {
        delete query.championId;
      }

      if(position === "ALL") {
        delete query.lane;
      }

      // 집계 파이프라인을 사용하여 승률 계산
      const pipeline = [
          {
              $match: query,
          },
          {
              $group: {
                  _id: "$_id",
                  totalGames: {$sum: {$add: ['$win', '$lose']}},
                  totalWins: {$sum: '$win'},
                  championName: {$first: '$championName'},
                  championId: {$first: '$championId'},
                  mainPerk: {$first: '$mainPerk'},
              },
          },
          {
              $project: {
                  winRate: {$divide: ['$totalWins', '$totalGames']},
                    championName: 1,
                    championId: 1,
                    mainPerk: 1,
                  totalGames: 1,
              },
          },
          {
              $match: {
                  totalGames: { $gte: 100 }, // totalGames가 100 이상인 결과만 필터링
              },
          },
          {
              $sort: {winRate: -1}, // 승률을 내림차순으로 정렬
          },
          {
              $limit: 20, // 상위 20개 결과만 가져옴
          },
      ];

      // 집계 파이프라인 실행
      const top20Results = await matchCollection.aggregate(pipeline).toArray();

      let now = 1;
    // 결과 반환
      let result = top20Results.map((item) => {
            return {
                id: item.championId,
                rankChangeImgUrl: "https://dm4vqiy2mlodi.cloudfront.net/mainPage/rankChange/RankSame.svg",
                rankChangeNumber: 0,
                championName: item.championName,
                championImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/champion/${item.championName}.svg`,
                mainRuneImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/mainRune/${item.mainPerk}.svg`,
                positionImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/position/${position}.svg`,
                winRate: (item.winRate * 100).toFixed(2) + "%",
                rankNumber: now++,
            };
      });

      return result;
  }
  getHello(): string {
    return 'Hello World!';
  }
}
