const { deployments, ethers } = require("hardhat")
const { developmentChains, NFT } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : // checks NFT configuration
      describe("NFT", () => {
          let deployer, nft
          const nftUri = NFT

          // Gets the deployer and nft configuration
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["all", "nft"])
              nft = await ethers.getContract("NFT")
          })
          // Test for constructor
          describe("Constructor", () => {
              // checks if values are set correctly
              it("Sets value correctly", async () => {
                  const name = await nft.name()
                  const symbol = await nft.symbol()

                  assert.equal(name.toString(), "Sumit_NFT") // checks if name is set correctly
                  assert.equal(symbol.toString(), "SNFT") // checks if symbol is set correctly
              })
          })
          // Test for mint function
          describe("mint", () => {
              // checks if counter is increased
              it("Increases counter", async () => {
                  const beforeCounter = await nft.getTokenCounter()
                  await nft.mint(nftUri)
                  const afterCounter = await nft.getTokenCounter()
                  assert.equal(afterCounter.toString(), beforeCounter.add("1").toString())
              })
              // checks if nft is minted
              it("mints an nft", async () => {
                  await nft.mint(nftUri)
                  const tokenCounter = await nft.getTokenCounter()
                  const tokenOwner = await nft.ownerOf(tokenCounter)

                  assert.equal(tokenOwner, deployer.address) // checks if token owner is set to deployer

                  const totalBalance = await nft.balanceOf(deployer.address)
                  assert.equal(totalBalance.toString(), "1") // checks if total token balance is increased
              })
              // checks if token uri is set correctly
              it("Sets token Uri", async () => {
                  await nft.mint(nftUri)
                  const tokenCounter = await nft.getTokenCounter()
                  const tokenUri = await nft.tokenURI(tokenCounter)
                  assert.equal(tokenUri.toString(), nftUri) // checks if tokenURI is set correctly
              })
          })
      })
