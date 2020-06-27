pragma solidity 0.6.10;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dai is ERC20 {
	constructor() ERC20("DAI", "DAI") public { }

	function mint(uint256 amount) external {
		_mint(msg.sender, amount);
	}

	function burn(uint256 amount) external {
		_burn(msg.sender, amount);
	}
}
