pragma solidity 0.6.10;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

contract ShareToken {
	using SafeMath for uint256;

	IERC20 public dai;
	mapping (address => mapping(uint256 => uint256)) public balanceOf;
	mapping (address => mapping(address => bool)) public isApprovedForAll;
	uint128 public feeNumerator = 1;
	uint128 public feeDenominator = 100;
	uint256 public numOutcomes = 2; // hard coded for MVP
	uint256 public numTicks = 100; // hard coded for MVP

	event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
	event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
	event ApprovalForAll(address indexed account, address indexed operator, bool approved);

	constructor(IERC20 _dai) public {
		dai = _dai;
	}

	function setApprovalForAll(address operator, bool approved) public {
		isApprovedForAll[msg.sender][operator] = approved;
		emit ApprovalForAll(msg.sender, operator, approved);
	}

	function unsafeTransferFrom(address from, address to, uint256 id, uint256 amount) public {
		require(to != address(0), "ERC1155: transfer to the zero address");
		require(from == msg.sender || isApprovedForAll[from][msg.sender], "ERC1155: caller is not owner nor approved");

		balanceOf[from][id] = balanceOf[from][id].sub(amount, "ERC1155: insufficient balance for transfer");
		balanceOf[to][id] = balanceOf[to][id].add(amount);

		emit TransferSingle(msg.sender, from, to, id, amount);
	}

	function unsafeBatchTransferFrom(address from, address to, uint256[] memory tokenIds, uint256[] memory values) public {
		require(tokenIds.length == values.length, "ERC1155: Batch Transfer: Token IDs length != values length");
		require(to != address(0), "ERC1155: Batch Transfer: Cannot send to 0 address.");
		require(from == msg.sender || isApprovedForAll[from][msg.sender], "ERC1155: Batch Transfer: 'msg.sender' not approved to send 'from' tokens.");
		for (uint256 i = 0; i < tokenIds.length; ++i) {
			uint256 tokenId = tokenIds[i];
			uint256 value = values[i];
			balanceOf[from][tokenId] = balanceOf[from][tokenId].sub(value);
			balanceOf[to][tokenId] = balanceOf[to][tokenId].add(value);
			emit TransferBatch(msg.sender, from, to, tokenIds, values);
		}
	}

	function publicBuyCompleteSets(address market, uint256 amount) external returns (bool) {
		uint256 cost = amount.mul(numTicks);

		dai.transferFrom(msg.sender, address(this), cost);

		for (uint256 i = 0; i <= numOutcomes; ++i) {
			uint256 tokenId = getTokenId(market, i);
			balanceOf[msg.sender][tokenId] = balanceOf[msg.sender][tokenId].add(amount);
		}

		return true;
	}

	function publicSellCompleteSets(address market, uint256 amount) external returns (bool) {
		uint256 payment = amount.mul(numTicks).mul(feeNumerator).div(feeDenominator);

		for (uint256 i = 0; i <= numOutcomes; ++i) {
			uint256 tokenId = getTokenId(market, i);
			balanceOf[msg.sender][tokenId] = balanceOf[msg.sender][tokenId].sub(amount);
		}

		dai.transfer(msg.sender, payment);

		return true;
	}

	function getTokenId(address market, uint256 outcome) public pure returns (uint256 tokenId) {
		bytes memory tokenIdBytes = abi.encodePacked(market, uint8(outcome));
		assembly { tokenId := mload(add(tokenIdBytes, add(0x20, 0))) }
	}

	function balanceOfBatch(address[] calldata owners, uint256[] calldata tokenIds) external view returns (uint256[] memory) {
		require(owners.length == tokenIds.length, "EIP 1155: batch balance requires same length owners and ids");
		uint256[] memory balances = new uint256[](owners.length);
		for (uint256 i = 0; i < owners.length; ++i) {
			address owner = owners[i];
			uint256 tokenId = tokenIds[i];
			balances[i] = balanceOf[owner][tokenId];
		}
		return balances;
	}
}
