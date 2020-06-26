pragma solidity 0.6.10;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IAugurMarket {

}

interface IAugurShareToken {
		function publicBuyCompleteSets(IAugurMarket _market, uint256 _amount) external returns (bool);
		function unsafeTransferFrom(address _from, address _to, uint256 _id, uint256 _value) external;
		function balanceOf(address owner, uint256 id) external view returns (uint256);
}

contract AugurConstantProduct is ERC20 {
	IAugurShareToken constant augurShareToken = IAugurShareToken(0x0); // TODO
	IAugurMarket constant augurMarket = IAugurMarket(0x0); // TODO
	IERC20 constant dai = IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F); // TODO
	uint256 constant numTicks = 100;
	uint256 constant INVALID = 0;
	uint256 constant NO = 1;
	uint256 constant YES = 2;

	constructor() ERC20("Augur Constant Product: Trump 2020", "ACP-TRUMP2020") public {
	}

	function addLiquidity(uint256 amountInAttodai) external {
		uint256 poolBalanceBefore = poolBalance();

		dai.transferFrom(msg.sender, address(this), amountInAttodai);
		augurShareToken.publicBuyCompleteSets(augurMarket, amountInAttodai);

		uint256 poolBalanceAfter = poolBalance();
		_mint(msg.sender, (poolBalanceAfter - poolBalanceBefore) / poolBalanceAfter);
	}

	function enterPosition(uint256 amountInAttodai, bool buyYes) external {
		dai.transferFrom(msg.sender, address(this), amountInAttodai);
		uint256 numInvalidAttoshares = amountInAttodai / numTicks;
		// give invalid shares equal to DAI deposited as invalid insurance
		augurShareToken.unsafeTransferFrom(address(this), msg.sender, INVALID, numInvalidAttoshares);
		// technically, the pool is selling complete sets to the caller so we treat the pools balance as though it is lower than it actually is for calculations since numInvalidAttoshares of YES and NO are technically owned by the user at this point
		uint256 yesBalance = augurShareToken.balanceOf(address(this), YES) - numInvalidAttoshares;
		uint256 noBalance = augurShareToken.balanceOf(address(this), NO) - numInvalidAttoshares;
		uint256 constantProduct = yesBalance * noBalance;
		// calculate and transfer an appropriate amount of YES or NO to the user (depending on which they bought)
		if (buyYes) {
			augurShareToken.unsafeTransferFrom(address(this), msg.sender, YES,  yesBalance - constantProduct / (noBalance + numInvalidAttoshares));
		} else {
			augurShareToken.unsafeTransferFrom(address(this), msg.sender, NO,  noBalance - constantProduct / (yesBalance + numInvalidAttoshares));
		}
	}

	function exitPosition(uint256 numInvalidAttoshares, bool sellYes) external {
		augurShareToken.unsafeTransferFrom(msg.sender, address(this), INVALID, numInvalidAttoshares);
		uint256 yesBalance = augurShareToken.balanceOf(address(this), YES);
		uint256 noBalance = augurShareToken.balanceOf(address(this), NO);
		uint256 constantProduct = yesBalance * noBalance;
		if (sellYes) {
			uint256 noDesired = numInvalidAttoshares;
			uint256 yesRequiredToSwapToNoDesired = constantProduct / (noBalance - noDesired) - yesBalance;
			uint256 totalYesRequired = yesRequiredToSwapToNoDesired + numInvalidAttoshares;
			augurShareToken.unsafeTransferFrom(msg.sender, address(this), YES, totalYesRequired);
		} else {
			uint256 yesDesired = numInvalidAttoshares;
			uint256 noRequiredToSwapToYesDesired = constantProduct / (yesBalance - yesDesired) - noBalance;
			uint256 totalNoRequired = noRequiredToSwapToYesDesired + numInvalidAttoshares;
			augurShareToken.unsafeTransferFrom(msg.sender, address(this), NO, totalNoRequired);
		}

		// TODO: support selling complete sets if the pool is short on DAI
		dai.transfer(msg.sender, numInvalidAttoshares * numTicks);
	}

	function swap(uint256 numAttoshares, bool buyYes) external {
		uint256 yesBalance = augurShareToken.balanceOf(address(this), YES);
		uint256 noBalance = augurShareToken.balanceOf(address(this), NO);
		uint256 constantProduct = yesBalance * noBalance;
		if (buyYes) {
			augurShareToken.unsafeTransferFrom(msg.sender, address(this), YES, numAttoshares);
			augurShareToken.unsafeTransferFrom(address(this), msg.sender, NO, noBalance - constantProduct / (yesBalance + numAttoshares));
		} else {
			augurShareToken.unsafeTransferFrom(msg.sender, address(this), NO, numAttoshares);
			augurShareToken.unsafeTransferFrom(address(this), msg.sender, YES, yesBalance - constantProduct / (noBalance + numAttoshares));
		}
	}

	function poolBalance() public view returns (uint256) {
		uint256 numInvalid = augurShareToken.balanceOf(address(this), INVALID);
		uint256 attodaiBalance = dai.balanceOf(address(this));
		uint256 invalidInAttodai = numInvalid / numTicks;
		return attodaiBalance + invalidInAttodai;
	}
}
