const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { saveFrontendFiles } = require("../utils/update-front-end")
const { verify } = require("../utils/verify")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const args = [1]
    const NftMarketPlace = await deploy("NFTMarketPlace", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmmations: network.config.blockConfirmation | 1,
    })

    saveFrontendFiles(NftMarketPlace.address, "NFTMarketPlace")

    if (!developmentChains.includes(network.name)) {
        verify(NftMarketPlace.address, args)
    }
}

module.exports.tags = ["all", "nftMarketPlace"]
