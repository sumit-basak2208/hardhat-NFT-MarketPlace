const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains, NFT } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : // Test for NFTMarketPlace contract and its dependencies
      describe("NFTMarketPlace", () => {
          let nft, nftMarketPlace, deployer, seller
          const nftUri = NFT

          // Gets the deployer nft contract and NFTMarketPlace contract
          beforeEach(async () => {
              await deployments.fixture(["all"])
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              seller = accounts[1]
              nft = await ethers.getContract("NFT")
              nftMarketPlace = await ethers.getContract("NFTMarketPlace")
          })

          // Tests for constructor
          describe("Constructor", () => {
              // Checks that the constructor sets the correct properties
              it("Sets constructor value correctly", async () => {
                  const feePercent = await nftMarketPlace.getFeePercent()
                  assert.equal(feePercent.toString(), "1") // checks if feePercent is set correctly

                  const feeAccount = await nftMarketPlace.getFeeAccount()
                  assert.equal(feeAccount.toString(), deployer.address) // checks if feeAccount is set correctly to deployer address
              })
          })
          // Tests for makeItem function
          describe("makeItems", () => {
              let tokenCounter, price

              // Mints an NFT for making items
              beforeEach(async () => {
                  await nft.mint(nftUri)
                  tokenCounter = await nft.getTokenCounter()
                  price = ethers.utils.parseEther("0.01")

                  /**
                   * @dev as functions are called via nftMarketPlace contract so it approves it to make neccessary changes
                   */
                  await nft.setApprovalForAll(nftMarketPlace.address, true)
              })

              // check if function reverts if price is 0
              it("Reverts if price is 0 ", async () => {
                  await expect(
                      nftMarketPlace.makeItem(nft.address, tokenCounter, 0)
                  ).to.be.revertedWith("NFTMarketPlace__NotEnoughPrice") // checks if correct error message is thrown when price is 0
              })

              // checks if function increases itemCount
              it("Increases total itemCount", async () => {
                  const beforeItmeCOunt = await nftMarketPlace.getItemCount()
                  await nftMarketPlace.makeItem(nft.address, tokenCounter, price)
                  const afterItemCount = await nftMarketPlace.getItemCount()
                  assert(afterItemCount.toString(), afterItemCount.add("1").toString()) // checks if itemCount is increased by 1
              })
              // checks if function tranfers ownership
              it("Transfer ownership from deployer to nftMarketPlace", async () => {
                  const ownerBeforeMakeItem = await nft.ownerOf(tokenCounter)
                  await nftMarketPlace.makeItem(nft.address, tokenCounter, price)
                  const ownerAfterMaketem = await nft.ownerOf(tokenCounter)

                  assert.equal(ownerAfterMaketem.toString(), nftMarketPlace.address) // checks if owner of the token is changed
                  assert(ownerAfterMaketem.toString() != ownerBeforeMakeItem.toString()) // checks if owner of the token is not changed
              })

              // adds item to items mapping after making an item
              it("Creates an item", async () => {
                  await nftMarketPlace.makeItem(nft.address, tokenCounter, price)
                  const itemCount = await nftMarketPlace.getItemCount()
                  const item = await nftMarketPlace.getItem(itemCount.toString())
                  assert.equal(item[0].toString(), itemCount.toString()) // for itemId
                  assert.equal(item[1].toString(), nft.address) // for nft
                  assert.equal(item[2].toString(), tokenCounter.toString()) // for tokenCounter
                  assert.equal(item[3].toString(), price) // for price
                  assert.equal(item[4].toString(), deployer.address) // for seller address
                  assert.equal(item[5].toString(), "false") // to check if the item is sold
              })

              // checks if function emits an event
              it("Emits an event", async () => {
                  await expect(nftMarketPlace.makeItem(nft.address, tokenCounter, price)).to.emit(
                      nftMarketPlace,
                      "Offered"
                  ) // checks if function emits the correct event
              })
          })

          // Tests for purchaseItem function
          describe("purchaseItem", () => {
              let tokenCounter, totalPrice, itemCount

              // same as makeItem beforeEach but also calls makeItem function and creates an item
              beforeEach(async () => {
                  const nftContract = await nft.connect(seller)
                  await nftContract.mint(nftUri)
                  tokenCounter = await nft.getTokenCounter()
                  const price = ethers.utils.parseEther("0.1")
                  await nftContract.setApprovalForAll(nftMarketPlace.address, true)
                  await nftMarketPlace.connect(seller).makeItem(nft.address, tokenCounter, price)
                  itemCount = await nftMarketPlace.getItemCount()
                  totalPrice = await nftMarketPlace.getTotalPrice(itemCount.toString()) // totalPrice = price + fee
              })

              // checks if function reverts if itemId is 0
              it("Reverts if itemId is 0", async () => {
                  await expect(nftMarketPlace.purchaseItem("0")).to.be.revertedWith(
                      "NFTMarketPlace__NotValidItemId"
                  )
              })

              //checks if function reverts if itemId is more than itemCount
              it("Reverts if itemId is more then itemCount", async () => {
                  await expect(
                      nftMarketPlace.purchaseItem(itemCount.add("1").toString())
                  ).to.be.revertedWith("NFTMarketPlace__NotValidItemId")
              })

              //checks if function reverts if ETH is not sent
              it("Reverts if no ETH is sent", async () => {
                  await expect(
                      nftMarketPlace.purchaseItem(itemCount.toString())
                  ).to.be.revertedWith("NFTMarketPlace__NotEnoughETH")
              })

              // checks if function reverts if ETH is less than price
              it("Reverts if sent ETH is less then price", async () => {
                  await expect(
                      nftMarketPlace.purchaseItem(itemCount.toString(), {
                          value: ethers.utils.parseEther("0.01"),
                      })
                  ).to.be.revertedWith("NFTMarketPlace__NotEnoughETH")
              })

              // checks if function reverts if item is already sold
              it("Reverts if item is already sold", async () => {
                  await nftMarketPlace.purchaseItem(itemCount.toString(), {
                      value: totalPrice.toString(),
                  })
                  await expect(
                      nftMarketPlace.purchaseItem(itemCount.toString(), {
                          value: totalPrice.toString(),
                      })
                  ).to.be.revertedWith("NFTMarketPlace__ItemSold")
              })

              // checks if function sends eth to seller and  onwer sets sold value to true and transfer NFT to purchaser
              it("Sends eth to feeAccount and seller account sets sold value to true and transfers nft", async () => {
                  // Promise listens for transaction to emit Sold event and test it
                  new Promise(async (resolve, reject) => {
                      nftMarketPlace.once("Sold", async () => {
                          try {
                              const deployerBalanceAfter = deployer.getBalances()
                              const sellerBalanceAfter = seller.getBalance()

                              assert.equal(await nftMarketPlace.sold(), true) // check if sold is set to true
                              assert.equal(
                                  deployerBalanceAfter.toString(),
                                  deployerBalanceBefore.add(totalPrice.sub("0.1")).toString()
                              ) // check if feeAccount gets feePercent
                              assert.equal(
                                  sellerBalanceAfter.toString(),
                                  sellerBalanceBefore.add(price).toString()
                              ) // check if seller account gets price

                              const tokenOwner = await nft.ownerOf(tokenCounter.toString())
                              assert.equal(tokenOwner.toString(), deployer.address) // check if NFT is transfered to deployer
                              assert(tokenOwner.toString() != seller.address) // check if NFT owner is not seller
                              resolve()
                          } catch (err) {
                              reject(err)
                          }
                      })
                  })
                  const deployerBalanceBefore = await deployer.getBalance()
                  const sellerBalanceBefore = await seller.getBalance()
                  const tx = await nftMarketPlace.purchaseItem(itemCount.toString(), {
                      value: totalPrice.toString(),
                  })
                  tx.wait(1)
              })
          })
      })
