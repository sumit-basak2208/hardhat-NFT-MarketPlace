//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    uint private s_tokenCounter;

    constructor() ERC721("Sumit_NFT", "SNFT") {}

    function mint(string memory _tokenUri) external returns (uint) {
        s_tokenCounter++;
        _safeMint(msg.sender, s_tokenCounter);
        _setTokenURI(s_tokenCounter, _tokenUri);
        return s_tokenCounter;
    }

    function getTokenCounter() public view returns (uint) {
        return s_tokenCounter;
    }
}
