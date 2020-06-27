pragma solidity 0.6.10;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ShareToken } from "./AugurMock.sol";
import { Dai } from "./DaiMock.sol";

interface IAugurShareToken {
		function publicBuyCompleteSets(address _market, uint256 _amount) external returns (bool);
		function unsafeTransferFrom(address _from, address _to, uint256 _id, uint256 _value) external;
		function balanceOf(address owner, uint256 id) external view returns (uint256);
}

contract AugurConstantProduct is ERC20 {
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

	function addLiquidity(uint256 attosharesToBuy) external {
		uint256 poolConstantBefore = poolConstant();

		dai.transferFrom(msg.sender, address(this), attosharesToBuy.mul(100));
		shareToken.publicBuyCompleteSets(augurMarket, attosharesToBuy);

		if (poolConstantBefore == 0) {
			_mint(msg.sender, poolConstant());
		} else {
			_mint(msg.sender, totalSupply() * poolConstant() / poolConstantBefore - totalSupply());
		}
	}

	function enterPosition(uint256 amountInAttodai, bool buyYes) external {
		dai.transferFrom(msg.sender, address(this), amountInAttodai);
		uint256 numInvalidAttoshares = amountInAttodai / numTicks;
		// give invalid shares equal to DAI deposited as invalid insurance
		shareToken.unsafeTransferFrom(address(this), msg.sender, INVALID, numInvalidAttoshares);
		// technically, the pool is selling complete sets to the caller so we treat the pools balance as though it is lower than it actually is for calculations since numInvalidAttoshares of YES and NO are technically owned by the user at this point
		uint256 yesBalance = shareToken.balanceOf(address(this), YES) - numInvalidAttoshares;
		uint256 noBalance = shareToken.balanceOf(address(this), NO) - numInvalidAttoshares;
		uint256 constantProduct = yesBalance * noBalance;
		// calculate and transfer an appropriate amount of YES or NO to the user (depending on which they bought)
		if (buyYes) {
			shareToken.unsafeTransferFrom(address(this), msg.sender, YES,  yesBalance - constantProduct / (noBalance + numInvalidAttoshares));
		} else {
			shareToken.unsafeTransferFrom(address(this), msg.sender, NO,  noBalance - constantProduct / (yesBalance + numInvalidAttoshares));
		}
	}

	function exitPosition(uint256 numInvalidAttoshares, bool sellYes) external {
		shareToken.unsafeTransferFrom(msg.sender, address(this), INVALID, numInvalidAttoshares);
		uint256 yesBalance = shareToken.balanceOf(address(this), YES);
		uint256 noBalance = shareToken.balanceOf(address(this), NO);
		uint256 constantProduct = yesBalance * noBalance;
		// TODO: figure out whether we need to sell yes or buy no based on the user's balance of each
		if (sellYes) {
			uint256 noDesired = numInvalidAttoshares;
			uint256 yesRequiredToSwapToNoDesired = constantProduct / (noBalance - noDesired) - yesBalance;
			uint256 totalYesRequired = yesRequiredToSwapToNoDesired + numInvalidAttoshares;
			shareToken.unsafeTransferFrom(msg.sender, address(this), YES, totalYesRequired);
		} else {
			uint256 yesDesired = numInvalidAttoshares;
			uint256 noRequiredToSwapToYesDesired = constantProduct / (yesBalance - yesDesired) - noBalance;
			uint256 totalNoRequired = noRequiredToSwapToYesDesired + numInvalidAttoshares;
			shareToken.unsafeTransferFrom(msg.sender, address(this), NO, totalNoRequired);
		}

		// TODO: support selling complete sets if the pool is short on DAI
		dai.transfer(msg.sender, numInvalidAttoshares * numTicks);
	}

	function swap(uint256 numAttoshares, bool buyYes) external {
		uint256 yesBalance = shareToken.balanceOf(address(this), YES);
		uint256 noBalance = shareToken.balanceOf(address(this), NO);
		uint256 constantProduct = yesBalance * noBalance;
		if (buyYes) {
			shareToken.unsafeTransferFrom(msg.sender, address(this), YES, numAttoshares);
			shareToken.unsafeTransferFrom(address(this), msg.sender, NO, noBalance - constantProduct / (yesBalance + numAttoshares));
		} else {
			shareToken.unsafeTransferFrom(msg.sender, address(this), NO, numAttoshares);
			shareToken.unsafeTransferFrom(address(this), msg.sender, YES, yesBalance - constantProduct / (noBalance + numAttoshares));
		}
	}

	function poolConstant() public view returns (uint256) {
		return shareToken.balanceOf(address(this), YES) * shareToken.balanceOf(address(this), NO);
	}
}
