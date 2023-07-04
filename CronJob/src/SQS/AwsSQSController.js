import {
    DeleteMessageCommand,
    GetQueueUrlCommand,
    ReceiveMessageCommand, SendMessageCommand,
    SQSClient
} from "@aws-sdk/client-sqs";
import SlackService from "../Slack/SlackService.js";
import * as crypto from "crypto";

class AwsSQSController {
    constructor() {
        // set sqs client
        this.sqs = new SQSClient({region: "ap-northeast-2", credentials: {
            accessKeyId: process.env.CONST_AWS_SQS_ACCESS_KEY_ID,
            secretAccessKey: process.env.CONST_AWS_SQS_SECRET_ACCESS_KEY
        }});
        this.slackService = SlackService.getInstance();
    }

    /**
     * get SQS URL
     * @param sqsName
     * @returns {Promise<string> | Promise<null>}
     */
    async get_SQS_URL(sqsName) {
        let params = {
            QueueName: sqsName
        };
        try {
            const data = await this.sqs.send(new GetQueueUrlCommand(params));
            return data.QueueUrl;
        } catch (err) {
            await this.slackService.sendMessage(process.env.Slack_Channel,
                "SettingUserInfo AwsSQSController.get_SQS_URL sqsName: " + sqsName + " err: " + err);
            return null;
        }
    }

    /**
     * get SQS message
     * @param sqsURl
     * @param visibilityTimeout
     * @param waitTimeSeconds
     * @param maxNumberOfMessages
     * @returns {Promise<Message[]|null>}
     */
    async getSQSMessage(sqsURl, visibilityTimeout = 60, waitTimeSeconds = 20, maxNumberOfMessages = 1){
        try {
            // get message
            let output = (await this.sqs.send(new ReceiveMessageCommand({
                QueueUrl: sqsURl,
                VisibilityTimeout: visibilityTimeout,
                WaitTimeSeconds: waitTimeSeconds,
                MaxNumberOfMessages: maxNumberOfMessages
            })));

            // if status code is not 200, send Slack message and return null
            if(output.$metadata.httpStatusCode !== 200){
                await this.slackService.sendMessage(process.env.Slack_Channel,
                    "SettingUserInfo AwsSQSController.getSQSMessage sqsURl: " + sqsURl + " err: " + output.$metadata.httpStatusCode);
                return null;
            }

            // if message is not exist, return null
            if(output.Messages === undefined) return null;

            // if message is exist, return message
            return output.Messages;

        } catch (err) {
            await this.slackService.sendMessage(process.env.Slack_Channel,
                "SettingUserInfo AwsSQSController.getSQSMessage sqsURl: " + sqsURl + " err: " + err);
            return null;
        }
    }

    /**
     * send SQS message
     * @param sqsURl
     * @param message
     * @returns {Promise<void>}
     */
    async sendSQSMessage(sqsURl, message) {
        // set group id & deduplication id
        let hash = crypto.createHash('sha256');
        let key = hash.update(JSON.stringify(message)).digest('hex');

        try {
            // send message
            await this.sqs.send(new SendMessageCommand(
                {
                    MessageBody: JSON.stringify(message),
                    MessageGroupId: key,
                    MessageDeduplicationId: key,
                    QueueUrl: sqsURl,
                }))
        } catch (err) {
            await this.slackService.sendMessage(process.env.Slack_Channel,
                "SettingUserInfo AwsSQSController.sendSQSMessage sqsURl: " + sqsURl + " err: " + err);
        }
    }

    /**
     * delete SQS message
     * @param sqsURl
     * @param receiptHandle
     * @returns {Promise<void>}
     */
    async deleteSQSMessage(sqsURl, receiptHandle) {
        try {
            await this.sqs.send(new DeleteMessageCommand(
                {
                    QueueUrl: sqsURl,
                    ReceiptHandle: receiptHandle
                }))
        } catch (err) {
            await this.slackService.sendMessage(process.env.Slack_Channel,
                "SettingUserInfo AwsSQSController.deleteSQSMessage sqsURl: " + sqsURl + " err: " + err);
        }
    }


    /**
     * singleton
     * @returns {AwsSQSController}
     */
    static getInstance(){
        if(!AwsSQSController.instance){
            AwsSQSController.instance = new AwsSQSController();
        }
        return AwsSQSController.instance;
    }
}

export default AwsSQSController;