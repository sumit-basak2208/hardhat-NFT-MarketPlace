const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { saveFrontendFiles } = require("../utils/update-front-end")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { log, deploy } = deployments
    const { deployer } = await getNamedAccounts()

    const args = []
    const nft = await deploy("NFT", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmation | 1,
    })

    saveFrontendFiles(nft.address, "NFT")

    if (!developmentChains.includes(network.name)) {
        verify(nft.address, args)
    }
}

module.exports.tags = ["all", "nft"]
