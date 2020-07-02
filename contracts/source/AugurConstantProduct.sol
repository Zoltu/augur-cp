pragma solidity 0.6.10;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ShareToken } from "./AugurMock.sol";
import { Dai } from "./DaiMock.sol";

contract AugurConstantProduct is ERC20 {
	using SafeMath for uint256;

	IERC20 public dai = new Dai();
	ShareToken public shareToken = new ShareToken(dai);
	address public constant augurMarket = address(0x0); // TODO
	uint256 public constant numTicks = 100;
	uint256 public INVALID;
	uint256 public NO;
	uint256 public YES;

	constructor() ERC20("Augur Constant Product: Trump 2020", "ACP-TRUMP2020") public {
		dai.approve(address(shareToken), 2**256-1);
		INVALID = shareToken.getTokenId(augurMarket, 0);
		NO = shareToken.getTokenId(augurMarket, 1);
		YES = shareToken.getTokenId(augurMarket, 2);
	}

	function addLiquidity(uint256 sharesToBuy) external {
		// TODO: gas golf this function a bit, though it doesn't really matter
		uint256 poolConstantBefore = sqrt(poolConstant());

		dai.transferFrom(msg.sender, address(this), sharesToBuy.mul(100));
		shareToken.publicBuyCompleteSets(augurMarket, sharesToBuy);

		if (poolConstantBefore == 0) {
			_mint(msg.sender, sqrt(poolConstant()));
		} else {
			_mint(msg.sender, totalSupply().mul(sqrt(poolConstant())).div(poolConstantBefore).sub(totalSupply()));
		}
	}

	function removeLiquidity(uint256 poolTokensToSell) external {
		uint256 poolSupply = totalSupply();
		(uint256 poolInvalid, uint256 poolNo, uint256 poolYes) = shareBalances(address(this));
		uint256 poolDai = dai.balanceOf(address(this));
		uint256 invalidShare = poolInvalid.mul(poolTokensToSell).div(poolSupply);
		uint256 noShare = poolNo.mul(poolTokensToSell).div(poolSupply);
		uint256 yesShare = poolYes.mul(poolTokensToSell).div(poolSupply);
		uint256 daiShare = poolDai.mul(poolTokensToSell).div(poolSupply);
		_burn(msg.sender, poolTokensToSell);
		shareTransfer(address(this), msg.sender, invalidShare, noShare, yesShare);
		dai.transfer(msg.sender, daiShare);

		// TODO: convert min(poolInvalid, poolYes, poolNo) to DAI by selling complete sets
		// CONSIDER: selling complete sets incurs Augur fees, maybe we should let the user sell the sets themselves if they want to pay the fee?
	}

	function enterPosition(uint256 amountInDai, bool buyYes) external returns (uint256) {
		(uint256 poolInvalid, uint256 poolNo, uint256 poolYes) = shareBalances(address(this));
		uint256 setsToBuy = amountInDai.div(numTicks);

		// simulate the user buying complete sets directly from the exchange
		uint256 invalidToUser = setsToBuy;
		uint256 noToUser = setsToBuy;
		uint256 yesToUser = setsToBuy;
		poolInvalid = poolInvalid.sub(invalidToUser, "AugurCP: The pool doesn't have enough INVALID tokens to fulfill the request.");
		poolNo = poolNo.sub(noToUser, "AugurCP: The pool doesn't have enough NO tokens to fulfill the request.");
		poolYes = poolYes.sub(yesToUser, "AugurCP: The pool doesn't have enough YES tokens to fulfill the request.");

		require(poolInvalid > 0, "AugurCP: The pool doesn't have enough INVALID tokens to fulfill the request.");
		require(poolNo > 0, "AugurCP: The pool doesn't have enough NO tokens to fulfill the request.");
		require(poolYes > 0, "AugurCP: The pool doesn't have enough YES tokens to fulfill the request.");

		// simulate user swapping YES to NO or NO to YES
		uint256 poolConstant = poolYes.mul(poolNo);
		if (buyYes) {
			// yesToUser += poolYes - poolConstant / (poolNo + noToUser)
			yesToUser = yesToUser.add(poolYes.sub(poolConstant.div(poolNo.add(noToUser))));
			noToUser = 0;
		} else {
			noToUser = noToUser.add(poolNo.sub(poolConstant.div(poolYes.add(yesToUser))));
			yesToUser = 0;
		}

		// materialize the final result of the simulation
		dai.transferFrom(msg.sender, address(this), amountInDai);
		shareTransfer(address(this), msg.sender, invalidToUser, noToUser, yesToUser);
	}

	function exitPosition(uint256 daiToBuy) external {
		(uint256 userInvalid, uint256 userNo, uint256 userYes) = shareBalances(msg.sender);
		// TODO: gas golf this down by creating another function that only fetches YES/NO
		(, uint256 poolNo, uint256 poolYes) = shareBalances(address(this));
		uint256 setsToSell = daiToBuy.div(numTicks);

		// short circuit if user is closing out their own complete sets
		if (userInvalid >= setsToSell && userNo >= setsToSell && userYes >= setsToSell) {
			shareTransfer(msg.sender, address(this), setsToSell, setsToSell, setsToSell);
			dai.transfer(msg.sender, daiToBuy);
			return;
		}

		require(userInvalid >= setsToSell, "AugurCP: You don't have enough invalid tokens to close out for this amount.");
		require(userNo > setsToSell || userYes > setsToSell, "AugurCP: You don't have enough YES or NO tokens to close out for this amount.");

		// simulate user swapping enough NO ➡ YES or YES ➡ NO to create setsToSell complete sets
		uint256 poolConstant = poolYes.mul(poolNo);
		uint256 invalidFromUser = setsToSell;
		uint256 noFromUser = 0;
		uint256 yesFromUser = 0;
		if (userYes > userNo) {
			uint256 noToUser = setsToSell.sub(userNo);
			uint256 yesToPool = poolConstant.div(poolNo.sub(noToUser)).sub(poolYes);
			require(yesToPool <= userYes.sub(setsToSell), "AugurCP: You don't have enough YES tokens to close out for this amount.");
			noFromUser = userNo;
			yesFromUser = yesToPool + setsToSell;
		} else {
			uint256 yesToUser = setsToSell.sub(userYes);
			uint256 noToPool = poolConstant.div(poolYes.sub(yesToUser)).sub(poolNo);
			require(noToPool <= userNo.sub(setsToSell), "AugurCP: You don't have enough NO tokens to close out for this amount.");
			yesFromUser = userYes;
			noFromUser = noToPool + setsToSell;
		}

		// materialize the complete set sale for dai
		shareTransfer(msg.sender, address(this), invalidFromUser, noFromUser, yesFromUser);
		dai.transfer(msg.sender, daiToBuy);
	}

	function swap(uint256 inputShares, bool inputYes) external returns (uint256) {
		// TODO: gas golf this down by creating another function that only fetches YES/NO
		(, uint256 poolNo, uint256 poolYes) = shareBalances(address(this));
		uint256 poolConstant = poolYes.mul(poolNo);
		if (inputYes) {
			uint256 yesFromUser = inputShares;
			// noToUser = poolNo - poolConstant / (poolYes + yesFromUser)
			uint256 noToUser = poolNo.sub(poolConstant.div(poolYes.add(yesFromUser)));
			shareToken.unsafeTransferFrom(msg.sender, address(this), YES, yesFromUser);
			shareToken.unsafeTransferFrom(address(this), msg.sender, NO, noToUser);
			return noToUser;
		} else {
			uint256 noFromUser = inputShares;
			uint256 yesToUser = poolYes.sub(poolConstant.div(poolNo.add(noFromUser)));
			shareToken.unsafeTransferFrom(msg.sender, address(this), NO, noFromUser);
			shareToken.unsafeTransferFrom(address(this), msg.sender, YES, yesToUser);
			return yesToUser;
		}
	}

	function poolConstant() public view returns (uint256) {
		return shareToken.balanceOf(address(this), YES) * shareToken.balanceOf(address(this), NO);
	}

	function shareBalances(address owner) private view returns (uint256 invalid, uint256 no, uint256 yes) {
		uint256[] memory tokenIds = new uint256[](3);
		tokenIds[0] = INVALID;
		tokenIds[1] = NO;
		tokenIds[2] = YES;
		address[] memory owners = new address[](3);
		owners[0] = owner;
		owners[1] = owner;
		owners[2] = owner;
		uint256[] memory balances = shareToken.balanceOfBatch(owners, tokenIds);
		invalid = balances[0];
		no = balances[1];
		yes = balances[2];
		return (invalid, no, yes);
	}

	function shareTransfer(address from, address to, uint256 invalidAmount, uint256 noAmount, uint256 yesAmount) private {
		uint256 size = (invalidAmount != 0 ? 1 : 0) + (noAmount != 0 ? 1 : 0) + (yesAmount != 0 ? 1 : 0);
		uint256[] memory tokenIds = new uint256[](size);
		uint256[] memory amounts = new uint256[](size);
		if (size == 0) {
			return;
		} else if (size == 1) {
			tokenIds[0] = invalidAmount != 0 ? INVALID : noAmount != 0 ? NO : YES;
			amounts[0] = invalidAmount != 0 ? invalidAmount : noAmount != 0 ? noAmount : yesAmount;
		} else if (size == 2) {
			tokenIds[0] = invalidAmount != 0 ? INVALID : NO;
			tokenIds[1] = invalidAmount != 0 ? YES : NO;
			amounts[0] = invalidAmount != 0 ? invalidAmount : noAmount;
			amounts[1] = invalidAmount != 0 ? yesAmount : noAmount;
		} else {
			tokenIds[0] = INVALID;
			tokenIds[1] = NO;
			tokenIds[2] = YES;
			amounts[0] = invalidAmount;
			amounts[1] = noAmount;
			amounts[2] = yesAmount;
		}
		shareToken.unsafeBatchTransferFrom(from, to, tokenIds, amounts);
	}

	// babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
	function sqrt(uint y) private pure returns (uint z) {
		if (y > 3) {
			z = y;
			uint x = y / 2 + 1;
			while (x < z) {
				z = x;
				x = (y / x + x) / 2;
			}
		} else if (y != 0) {
			z = 1;
		}
	}
}
