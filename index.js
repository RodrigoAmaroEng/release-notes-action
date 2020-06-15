const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')
const fs = require('fs')

async function run() {
    try {
        const nowSecureToken = core.getInput('token');
        const filePath = core.getInput('artifact_path');
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        console.log(`File ${filePath} with ${fileSizeInBytes} bytes`)
        if (!nowSecureToken || nowSecureToken.length < 1) {
            throw new Error('No token was provided')
        }
        let readStream = fs.createReadStream(filePath);
        await fetch('https://lab-api.nowsecure.com/build/', {
            method: 'POST',
            headers: {
                "Authorization": "Bearer " + nowSecureToken,
                "Content-length": fileSizeInBytes,
                "Content-type": 'application/x-www-form-urlencoded'
            },
            body: readStream
        }).then(data => data.json())
            .then(resp => {
                if (resp.message && resp.name)
                    throw new Error(resp.message)
                core.setOutput('appId', resp.application)
                core.setOutput('taskId', resp.task)
                console.log("File successfully sent to Now Secure")
            })

    } catch (error) {
        core.setFailed(error.message);
    }
}

run()