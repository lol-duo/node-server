import { Injectable } from '@nestjs/common';
import {MongoClient} from "mongodb";

let soloCollection = null;
let duoCollection = null;
let client = null;

// set mongoose
try {
    console.log(process.env.mongoDB_URI);
    client = new MongoClient("mongodb://100.108.189.101:27017/?directConnection=true&serverSelectionTimeoutMS=2000");
    // @ts-ignore
    client.connect();

    const database = client.db("lolDuo");
    soloCollection = database.collection("solo");
    duoCollection = database.collection("duo");

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
                  lane: {$first: '$lane'},
              },
          },
          {
              $project: {
                  winRate: {$divide: ['$totalWins', '$totalGames']},
                    championName: 1,
                    championId: 1,
                    mainPerk: 1,
                    totalGames: 1,
                    lane: 1,
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
      const top20Results = await soloCollection.aggregate(pipeline).toArray();

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
                positionImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/position/${item.lane}.svg`,
                winRate: (item.winRate * 100).toFixed(2) + "%",
                rankNumber: now++,
                totalGames: item.totalGames,
            };
      });

      return result;
  }

  async getDuoInfo(championId: string, position: string, championId2: string, position2: string, version: string = "13.17"): Promise<any> {
      console.log(championId, position, championId2, position2, version);
      let chpId = parseInt(championId);
      let chpId2 = parseInt(championId2);

      let query = {
          champion1Id: { $in: [chpId, chpId2] },
          champion2Id: { $in: [chpId, chpId2] },
          lane1: { $in: [position, position2] },
          lane2: { $in: [position, position2] },
          gameMode: "CLASSIC",
          gameType: "MATCHED_GAME",
          queueId: 420,
          mapId: 11,
          version: version,
      };

      if(chpId === 0 && chpId2 === 0) {
          delete query.champion1Id;
          delete query.champion2Id;
      }
      else if(chpId === 0) {
          delete query.champion1Id;
          delete query.champion2Id;
          const newQuery = {
              $or: [
                  { champion1Id: chpId2 },
                  { champion2Id: chpId2 }
              ],
              ...query
          }
          query = newQuery;
      } else if(chpId2 === 0) {
            delete query.champion1Id;
            delete query.champion2Id;
            const newQuery = {
                $or: [
                    { champion1Id: chpId },
                    { champion2Id: chpId }
                ],
                ...query
            }
            query = newQuery;
      }

      if(position === "ALL" && position2 === "ALL") {
           delete query.lane1;
              delete query.lane2;
      }else if( position === "ALL") {
          delete query.lane1;
            delete query.lane2;
            const newQuery = {
                $or: [
                    { lane1: position2 },
                    { lane2: position2 }
                ],
                ...query
            }
            query = newQuery;
      }
        else if( position2 === "ALL") {
            delete query.lane1;
            delete query.lane2;
            const newQuery = {
                $or: [
                    { lane1: position },
                    { lane2: position }
                ],
                ...query
            }
            query = newQuery;
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
                  champion1Name: {$first: '$champion1Name'},
                  champion1Id: {$first: '$champion1Id'},
                  mainPerk1: {$first: '$mainPerk1'},
                  lane1: {$first: '$lane1'},
                  champion2Name: {$first: '$champion2Name'},
                  champion2Id: {$first: '$champion2Id'},
                  mainPerk2: {$first: '$mainPerk2'},
                  lane2: {$first: '$lane2'},
              },
          },
          {
              $project: {
                  winRate: {$divide: ['$totalWins', '$totalGames']},
                  champion1Name: 1,
                  champion1Id: 1,
                  mainPerk1: 1,
                  totalGames: 1,
                  lane1: 1,
                  champion2Name: 1,
                  champion2Id: 1,
                  mainPerk2: 1,
                  lane2: 1,
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
      const top20Results = await duoCollection.aggregate(pipeline).toArray();

      let now = 1;
      // 결과 반환
      let result = top20Results.map((item) => {
          return {
              id1: item.champion1Id,
                id2: item.champion2Id,
              rankChangeImgUrl: "https://dm4vqiy2mlodi.cloudfront.net/mainPage/rankChange/RankSame.svg",
              rankChangeNumber: 0,
              champion1: {
                  championName: item.champion1Name,
                  championImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/champion/${item.champion1Name}.svg`,
                  mainRuneImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/mainRune/${item.mainPerk1}.svg`,
                  positionImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/position/${item.lane1}.svg`,
              },
                champion2: {
                    championName: item.champion2Name,
                    championImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/champion/${item.champion2Name}.svg`,
                    mainRuneImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/mainRune/${item.mainPerk2}.svg`,
                    positionImgUrl: `https://dm4vqiy2mlodi.cloudfront.net/mainPage/position/${item.lane2}.svg`,
                },
              winRate: (item.winRate * 100).toFixed(2) + "%",
              rankNumber: now++,
                totalGames: item.totalGames,
          };
      });

      return result;
  }

  getHello(): string {
    return 'Hello World!';
  }
}
