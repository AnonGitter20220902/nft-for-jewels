const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const util = require('util');

util.inspect.defaultOptions.maxArrayLength = null;
util.inspect.defaultOptions.depth = null;

describe("Jewelry Integration Testing", () => {
	let jewelry, auction, delivery;
	let signers, ca, jp, rs, cs, c;

	before("Getting signers", async () => {
		signers = await ethers.getSigners();
		[ca, jp, rs, cs, ...c] = signers;
	});

	it("Deploy Jewelry smart contract", async () => {
		const Jewelry = await ethers.getContractFactory("Jewelry");

		jewelry = await Jewelry.connect(ca).deploy();
		console.log("Jewelry SC EA: ", jewelry.address);
	});

	it("Mint jewerlry", async () => {
		const request = await jewelry.connect(ca).mint(
			100,
			"QmZiqkyH6W2we9haaeYuj8Zmk4diRgbyQ8vLRYF6cfEEzx",
			jp.address
		)
		const receipt = await request.wait();
		const log = {
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed,
			inputs: {
				_item: 100,
				_uri: "QmZiqkyH6W2we9haaeYuj8Zmk4diRgbyQ8vLRYF6cfEEzx",
				_to: jp.address
			},
			events: 
				receipt.events.map( (event) => ({
					[event.event]:
						Object.entries(event.args)
							.reduce(
								(acc,[key,val]) => {
									if (isNaN(key)) acc[key]=val; 
									return acc;
								}
								,{})
				}))
		};
		console.log(log);
	});

	it("Approve purchase to RS", async () => {
		await jewelry.connect(jp).approveTransfer(
			rs.address,
			0
		);

		const log = {
			to: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
			gasUsed: 0,
			inputs: {
				tokenId: 0
			},
			outputs: {
				address: await jewelry.ownerOf(0)
			}
		};
		console.log(log);
	});

	it("Deploy Auction smart contract", async () => {
		const Auction = await ethers.getContractFactory("Auction");
		auction = await Auction.connect(rs).deploy(
			0,
			60 * 60 * 2
		);
		console.log("Auction SC EA: ", auction.address);
	});

	it("Bidding", async () => {
		await auction.connect(c[0]).bid({value: ethers.utils.parseEther("0.5")});
		await auction.connect(c[1]).bid({value: ethers.utils.parseEther("0.6")});
		await auction.connect(c[2]).bid({value: ethers.utils.parseEther("0.7")});
		await auction.connect(c[3]).bid({value: ethers.utils.parseEther("0.8")});
		await auction.connect(c[0]).bid({value: ethers.utils.parseEther("0.9")});

		await auction.connect(c[1]).withdraw();
		await auction.connect(c[2]).withdraw();
		await auction.connect(c[3]).withdraw();
	});

	it("Close bidding", async () =>{
		await time.increase(60 * 60 * 2);
		await auction.connect(rs).auctionClosed();
	});

	it("Deploy Delivery smart contract", async () => {
		const Delivery = await ethers.getContractFactory("Delivery");
		delivery = await Delivery.connect(rs).deploy();
		await delivery.connect(rs).changeDeposit(
			ethers.utils.parseEther("0.5")
		);
		console.log("Delivery SC EA: ", delivery.address);
	});

	it("Approve auction winner", async () => {
		await delivery.connect(rs).approveBuyer(
			c[0].address,
			100
		);
		console.log({
			address: cs.address,
			balance: ethers.utils.formatEther(await cs.getBalance()) + " ETH"
		});
		console.log({
			address: c[0].address,
			balance: ethers.utils.formatEther(await c[0].getBalance()) + " ETH"
		});
	});

	it("Send security deposits and start delivery", async () => {
		const request = await delivery.connect(cs).courierEstablishDelivery(
			c[0].address,
			100,
			{value: ethers.utils.parseEther("0.5")}
		);
		const receipt = await request.wait();
		const log = {
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed,
			inputs: {
				_buyer: c[0].address,
				_item: 100
			},
			value: ethers.utils.parseEther("0.5"),
			events: 
				receipt.events.map( (event) => ({
					[event.event]:
						Object.entries(event.args)
							.reduce(
								(acc,[key,val]) => {
									if (isNaN(key)) acc[key]=val; 
									return acc;
								}
								,{})
				}))
		};
		console.log(log);
	});

	it("Send security deposits and start delivery", async () => {
		const request = await delivery.connect(c[0]).buyerDeposit(
			cs.address,
			{value: ethers.utils.parseEther("0.5")}
		);
		const receipt = await request.wait();
		const log = {
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed,
			inputs: {
				_courier: cs.address
			},
			value: ethers.utils.parseEther("0.5"),
			events: 
				receipt.events.map( (event) => ({
					[event.event]:
						Object.entries(event.args)
							.reduce(
								(acc,[key,val]) => {
									if (isNaN(key)) acc[key]=val; 
									return acc;
								}
								,{})
				}))
		};
		console.log(log);
	});

	it("Confirm delivery and return deposits", async () => {
		const request = await delivery.connect(c[0]).buyerApproval(
			cs.address,
			true,
			auction.address
		);
		const receipt = await request.wait();
		const log = {
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed,
			inputs: {
				_courier: cs.address,
				_approval: true,
				_auction: auction.address
			},
			events: 
				receipt.events.map( (event) => ({
					[event.event]:
						Object.entries(event.args)
							.reduce(
								(acc,[key,val]) => {
									if (isNaN(key)) acc[key]=val; 
									return acc;
								}
								,{})
				}))
		};
		console.log(log);

		await delivery.connect(rs).getBalance();

		console.log({
			address: cs.address,
			balance: ethers.utils.formatEther(await cs.getBalance()) + " ETH"
		});
		console.log({
			address: c[0].address,
			balance: ethers.utils.formatEther(await c[0].getBalance()) + " ETH"
		});
	});

	it("Transfer jewelry to buyer", async () => {
		const request = await jewelry.connect(rs).approveTransfer(
			c[0].address,
			0
		);
		const receipt = await request.wait();
		const log = {
			from: receipt.from,
			to: receipt.to,
			gasUsed: receipt.gasUsed,
			inputs: {
				_to: c[0].address,
				_tokenId: 0,
			},
			events: 
				receipt.events.map( (event) => ({
					[event.event]:
						Object.entries(event.args)
							.reduce(
								(acc,[key,val]) => {
									if (isNaN(key)) acc[key]=val; 
									return acc;
								}
								,{})
				}))
		};
		console.log(log);
		
		console.log({
			to: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
			gasUsed: 0,
			inputs: {
				tokenId: 0
			},
			outputs: {
				address: await jewelry.ownerOf(0)
			}
		});
	});
});