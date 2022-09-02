// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Auction.sol";

contract Delivery {
	struct CourierType {
		uint256 itemSN;
		address payable buyerEA;
		bool courierPaid;
		bool buyerPaid;
		bool busy;
	}

	address public retailStore;
	uint256 secuirtyDeposit = 1 ether;

	mapping(address => bool) approvedBuyer;
	mapping(address => bool) courierPaid;
	mapping(uint256 => address) itemToBuyer;
	mapping(address => CourierType) public couriers;

	event newDeliveryRequest(address buyerEA, uint256 tokenID);
	event deliveryTaken(address courierEA);
	event startDelivery(address courierEA, uint256 time);
	event successfulDelivery(address courierEA, address buyerEA, uint256 itemSN);
	event failedDelivery(address courierEA, address buyerEA, uint256 itemSN);

	constructor() {
		retailStore = msg.sender;
	}

	modifier onlyRetail() {
		require(msg.sender == retailStore, "NOT_RETAIL_STORE");
		_;
	}

	function approveBuyer(address _buyerEA, uint256 _itemSN) external onlyRetail {
		approvedBuyer[_buyerEA] = true;
		itemToBuyer[_itemSN] = _buyerEA;
		emit newDeliveryRequest(_buyerEA, _itemSN);
	}

	function courierEstablishDelivery(address payable _buyerEA, uint256 _itemSN)
		public
		payable
	{
		require(msg.value == secuirtyDeposit, "NOT_ENOUGH_ETHER");
		require(itemToBuyer[_itemSN] == _buyerEA, "ERROR_BUYER_ITEM");
		require(!couriers[msg.sender].busy, "COURIER_HAS_REQUEST");

		couriers[msg.sender].itemSN = _itemSN;
		couriers[msg.sender].buyerEA = _buyerEA;
		couriers[msg.sender].courierPaid = true;

		emit deliveryTaken(msg.sender);
	}

	function buyerDeposit(address courierEA) public payable {
		require(msg.sender == couriers[courierEA].buyerEA, "NOT_CORRECT_BUYER");
		require(msg.value == secuirtyDeposit, "NOT_ENOUGH_ETHER");
		require(couriers[courierEA].courierPaid, "NO_DEPOSIT");

		couriers[courierEA].buyerPaid = true;
		couriers[courierEA].busy = true;

		emit startDelivery(courierEA, block.timestamp);
	}

	function buyerApproval(
		address payable courierEA,
		bool approved,
		address _auction
	) public payable {
		require(msg.sender == couriers[courierEA].buyerEA, "NOT_CORRECT_BUYER");
		if (approved) {
			payable(msg.sender).transfer(secuirtyDeposit);
			courierEA.transfer(secuirtyDeposit);
			Auction(_auction)._transferBid(msg.sender);
			emit successfulDelivery(
				courierEA,
				msg.sender,
				couriers[courierEA].itemSN
			);
		} else {
			emit failedDelivery(courierEA, msg.sender, couriers[courierEA].itemSN);
		}
	}

	function returnDeposit(address payable accountEA) external onlyRetail {
		accountEA.transfer(secuirtyDeposit);
	}

	function changeDeposit(uint256 _fee) external onlyRetail {
		secuirtyDeposit = _fee;
	}

	function getBalance() public view returns (uint256) {
		return address(this).balance;
	}
}
