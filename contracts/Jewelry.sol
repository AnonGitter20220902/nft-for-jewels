// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Jewelry is ERC721, Ownable {
	using Counters for Counters.Counter;

	Counters.Counter private tokenIdGen;
	mapping(uint256 => uint256) private itemToToken;
	mapping(uint256 => string) private tokenToURI;
	mapping(uint256 => address) private tokenToJP;

	constructor() ERC721("Jewelry NFT", "JWLRY") {}

	event NewJewelry(uint256 item, uint256 tokenId);

	function mint(
		uint256 _item,
		string calldata _uri,
		address _to
	) external onlyOwner {
		uint256 _tokenId = tokenIdGen.current();
		tokenIdGen.increment();
		tokenToURI[_tokenId] = _uri;
		itemToToken[_item] = _tokenId;
		_mint(_to, _tokenId);
		emit NewJewelry(_item, _tokenId);
	}

	function approveTransfer(address _buyer, uint256 _item) external {
		uint256 _tokenId = itemToToken[_item];
		_transfer(ownerOf(_tokenId), _buyer, _tokenId);
	}
}
