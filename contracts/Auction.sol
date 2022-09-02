// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Auction is Ownable {
	uint256 private tokenId; // where the topBid will be transferred
	uint256 private auctionClose; // when the auction will close

	address private topBidder; // top bidder to date
	uint256 private topBid; // top bid to date

	// Allowed withdrawals of previous bids
	mapping(address => uint256) returnsPending; // return balance of bidders who are no longer top bidders

	bool auctionComplete; // status of auction completion

	/// Create an auction with `_biddingTime`
	/// seconds for bidding on behalf of the
	/// tokenId address `_tokenId`.
	constructor(uint256 _tokenId, uint256 _biddingTime) {
		tokenId = _tokenId;
		auctionClose = block.timestamp + _biddingTime;
	}

	event topBidIncreased(address bidder, uint256 bidAmount);

	/// You may bid on the auction with the value sent
	/// along with this transaction.
	/// The value may only be refunded if the
	/// auction was not won.
	function bid() public payable {
		require(block.timestamp <= auctionClose); // bid period is over
		require(msg.value > topBid); // bid not greater than top bid

		if (topBidder != address(0)) {
			returnsPending[topBidder] += topBid; // add to balance of topBidder
		}

		topBidder = msg.sender;
		topBid = msg.value;
		emit topBidIncreased(topBidder, topBid);
	}

	/// Withdraw a bid that was overbid.
	function withdraw() public payable returns (bool) {
		uint256 bidAmount = returnsPending[msg.sender];
		if (bidAmount > 0) {
			returnsPending[msg.sender] = 0;

			if (!payable(msg.sender).send(bidAmount)) {
				returnsPending[msg.sender] = bidAmount;
				return false;
			}
		}
		return true;
	}

	event auctionResult(address winner, uint256 bidAmount);

	/// Auction ends and highest bid is sent to the tokenId.
	function auctionClosed() public {
		require(block.timestamp >= auctionClose); // auction did not yet end
		require(!auctionComplete); // this function has already been called

		auctionComplete = true;
		emit auctionResult(topBidder, topBid);

		//tokenId.transfer(topBid);
	}

	function _transferBid(address _to) external payable {
		payable(_to).transfer(topBid);
	}
}
