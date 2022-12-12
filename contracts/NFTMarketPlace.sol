//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NFTMarketPlace__NotEnoughPrice(); // If price is less then or equal to zero
error NFTMarketPlace__NotValidItemId(); // if itemId is invalid
error NFTMarketPlace__NotEnoughETH(); // if purchaser sends less eth
error NFTMarketPlace__ItemSold(); // if item is already sold

/**
 * @title A sample NFT Market Place
 * @author Sumit Basak
 */

contract NFTMarketPlace is ReentrancyGuard {
    //Struct of every nft for sell
    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    //state variables
    address payable private immutable i_feeAccount; //where eth is deposited
    uint private immutable i_feePercent; //percentage of commision
    uint private s_itemCount; //to count total nft for sell

    mapping(uint => Item) private s_items; // stores all nft for sell

    //events
    event Offered(address indexed nft, uint itemId, uint tokenId, address seller, uint price);
    event Sold(
        address indexed nft,
        uint itemId,
        uint tokenId,
        address seller,
        address buyer,
        uint price
    );

    constructor(uint _feePercent) {
        i_feePercent = _feePercent;
        i_feeAccount = payable(msg.sender);
    }

    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        if (_price <= 0) revert NFTMarketPlace__NotEnoughPrice();
        //increases item count
        s_itemCount++;

        //Transfer nft to this address so it can change owner at will when nft is sold
        _nft.transferFrom(msg.sender, address(this), _tokenId);

        //Makes an item and stores in s_items mapping
        s_items[s_itemCount] = Item(
            s_itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );

        emit Offered(address(_nft), s_itemCount, _tokenId, msg.sender, _price);
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        //checks if itmeId is valid or not
        if (_itemId > s_itemCount || _itemId <= 0) revert NFTMarketPlace__NotValidItemId();
        // Checks if enough eth is sent
        if (msg.value < _totalPrice) revert NFTMarketPlace__NotEnoughETH();
        // Checks if itme is sold or not
        if (s_items[_itemId].sold == true) revert NFTMarketPlace__ItemSold();

        //Transfers fund to seller and owner and trasnfers ownership of the contract
        _transferNft(_itemId);
    }

    function _transferNft(uint _itemId) internal {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = s_items[_itemId]; // Gets itme with itmeId as _itemId

        //transfer funds to seller
        (bool sellerSuccess, ) = item.seller.call{value: item.price}("");
        // transfer fees ot owner
        (bool adminSuccess, ) = i_feeAccount.call{value: (_totalPrice - item.price)}("");

        // Checks if fund transfer is completed or not
        if (sellerSuccess && adminSuccess) {
            //changes owner of nft
            item.nft.transferFrom(address(this), msg.sender, item.tokenId);
            item.sold = true;
            emit Sold(
                address(item.nft),
                _itemId,
                item.tokenId,
                item.seller,
                msg.sender,
                _totalPrice
            );
            // sets sold ot true
        } else {
            revert();
        }
    }

    // Adds fees
    function getTotalPrice(uint _itemId) public view returns (uint) {
        return ((s_items[_itemId].price * (100 + i_feePercent)) / 100);
    }

    //return account where fees is transfered
    function getFeeAccount() public view returns (address) {
        return i_feeAccount;
    }

    // returns fee percentage to be taken
    function getFeePercent() public view returns (uint) {
        return i_feePercent;
    }

    // returns total number of items for sale
    function getItemCount() public view returns (uint) {
        return s_itemCount;
    }

    // returns Item of specified id
    function getItem(uint _id) public view returns (Item memory) {
        return s_items[_id];
    }
}
