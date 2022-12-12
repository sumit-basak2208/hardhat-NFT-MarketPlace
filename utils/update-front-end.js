const fs = require("fs")

function saveFrontendFiles(address, name) {
    const contractsDir = __dirname + "/../../nft-front-end/src/contractsData"

    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir)
    }

    fs.writeFileSync(
        contractsDir + `/${name}-address.json`,
        JSON.stringify({ address: address }, undefined, 2)
    )

    const contractArtifact = artifacts.readArtifactSync(name)

    fs.writeFileSync(contractsDir + `/${name}.json`, JSON.stringify(contractArtifact, null, 2))
}

module.exports = { saveFrontendFiles }
