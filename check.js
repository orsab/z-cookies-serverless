const axios = require('axios')
const exec = require('child_process').execSync

console.log(Buffer.from("cookies").toString('base64'))

const run = async () => {
    const getLastLogStream = (group) => {
        const streams = JSON.parse(exec(`aws --profile btcwin --region us-east-1 logs describe-log-streams --log-group-name '${group}'`).toString())
        return streams.logStreams.sort((a,b) => a.creationTime - b.creationTime).pop()
    }
    const getLastLogEvent = (group, logName) => {
        const streams = JSON.parse(exec(`aws --profile btcwin --region us-east-1 logs get-log-events --log-group-name '${group}' --log-stream-name '${logName}'`).toString())
        console.log(streams)
        return streams.events.map(e => e.message)
    }

    // const logGroup = '/aws/lambda/zorrox-cookies-dev-screenshot'
    const logGroup = '/aws/lambda/zorrox-cookies-dev-cookies'
    const lastStream = getLastLogStream(logGroup)

    const logs = getLastLogEvent(logGroup, lastStream.logStreamName)

    console.log(logs)
}

run()