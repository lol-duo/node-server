import express from "express";
import Service from "../service/service.js";

class ServerInfoController {
    constructor() {

        let router = express.Router();
        let service = Service.getInstance();

        //get call count
        router.get('/apiCallCount', (req, res) => {
            res.send({count: service.getCallCount()});
        });

        //reset call count
        router.get('/resetApiCallCount', (req, res) => {
            service.resetCallCount();
            res.send("success");
        });

        this.router = router;
    }

    getRouter(){
        return this.router;
    }
}


export default ServerInfoController;