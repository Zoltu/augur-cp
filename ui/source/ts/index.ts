import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { BrowserDependencies } from '@zoltu/solidity-typescript-generator-browser-dependencies'
import { createOnChangeProxy } from './library/proxy'
import { refreshableAsyncState } from './library/react-utilities'
import { AugurConstantProduct, ShareToken, Dai } from './generated/augur-constant-product'
import { AppModel, App } from './components/App'

const jsonRpcAddress = 'http://localhost:1237'
const rpc = new FetchJsonRpc(jsonRpcAddress, window.fetch.bind(window), {})
const fetchDependencies = new FetchDependencies(rpc)
const browserDependencies = new BrowserDependencies(fetchDependencies, {})
const augurConstantProduct = new AugurConstantProduct(browserDependencies, 0xff2e82463af56027d6b2fd94f681d9519096b416n)
const marketAddress = 0x0n

async function main() {
	// TODO: start rendering the page before waiting for this
	const shareToken = new ShareToken(browserDependencies, await augurConstantProduct.shareToken_())
	const dai = new Dai(browserDependencies, await augurConstantProduct.dai_())
	// TODO: calculate these in TS, no need for round trips to get them
	const yesTokenId = await shareToken.getTokenId_(marketAddress, 2n)
	const noTokenId = await shareToken.getTokenId_(marketAddress, 1n)
	const invalidTokenId = await shareToken.getTokenId_(marketAddress, 0n)

	// create our root model as a proxy object that will auto-rerender anytime its properties (recursively) change
	const rootModel = createOnChangeProxy<AppModel>(render, {
		pool: refreshableAsyncState(render, async () => {
			const supply = await augurConstantProduct.totalSupply_()
			const daiBalance = await dai.balanceOf_(augurConstantProduct.address)
			const yes = await shareToken.balanceOf_(augurConstantProduct.address, yesTokenId)
			const no = await shareToken.balanceOf_(augurConstantProduct.address, noTokenId)
			const invalid = await shareToken.balanceOf_(augurConstantProduct.address, invalidTokenId)
			return { dai: daiBalance, supply, yes, no, invalid }
		}),
		user: {
			connect: () => {
				rootModel.user = refreshableAsyncState(render, async () => {
					if (!browserDependencies.isEthereumBrowser()) throw new Error(`Need an Ethereum enabled browser`)
					const account = await connectToEthereumBrowser()
					return {
						pool: await augurConstantProduct.balanceOf_(account),
						dai: await dai.balanceOf_(account),
						yes: await shareToken.balanceOf_(account, yesTokenId),
						no: await shareToken.balanceOf_(account, noTokenId),
						invalid: await shareToken.balanceOf_(account, invalidTokenId),
						daiApproved: await dai.allowance_(account, augurConstantProduct.address) !== 0n,
						shareApproved: await shareToken.isApprovedForAll_(account, augurConstantProduct.address),
					}
				})
			}
		},
		addLiquidity: (shares: bigint) => {
			// TODO: make into a modal that prompts to connect, then prompts for approval, then adds liquidity and presents errors along the way
			augurConstantProduct.addLiquidity(shares)
				.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.then(() => rootModel.pool.refresh())
				.catch(console.error)
		},
		removeLiquidity: (poolTokens: bigint) => {
			augurConstantProduct.removeLiquidity(poolTokens)
				.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.then(() => rootModel.pool.refresh())
				.catch(console.error)
		},
		swap: (...[inputToken, inputAmount, outputToken]) => {
			const promise = (inputToken === 'dai') ? augurConstantProduct.enterPosition(inputAmount, outputToken === 'yes')
				: (outputToken === 'dai') ? augurConstantProduct.exitPosition(inputAmount * 100n)
				: augurConstantProduct.swap(inputAmount, inputToken === 'yes')
			promise
			.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.then(() => rootModel.pool.refresh())
				.catch(console.error)
		},
		mintDai: () => {
			// TODO: make into a modal that prompts to connect, then prompts for amount, then mints and presents errors along the way
			dai.mint(100_000n * 10n**18n)
				.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.catch(console.error)
		},
		approveDai: () => {
			// TODO: make into a modal that prompts to connect, then approves and presents errors along the way
			dai.approve(augurConstantProduct.address, 2n**256n - 1n)
				.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.catch(console.error)
		},
		approveShareToken: () => {
			// TODO: make into a modal that prompts to connect, then approves and presents errors along the way
			shareToken.setApprovalForAll(augurConstantProduct.address, true)
				.then(() => 'connect' in rootModel.user || rootModel.user.refresh())
				.catch(console.error)
		},
	})

	// put the root model on the window for debugging convenience
	;(window as any).rootModel = rootModel

	// find the HTML element we will attach to
	const main = document.querySelector('main')

	// specify our render function, which will be fired anytime rootModel is mutated
	function render() {
		const element = React.createElement(App, rootModel)
		ReactDOM.render(element, main)
	}

	// kick off the initial render
	render()
}
main().catch(console.error)

async function connectToEthereumBrowser() {
	// TODO: handle non-ethereum-browser scenario better
	if (!browserDependencies.isEthereumBrowser()) throw new Error(`Need an Ethereum enabled browser`)
	// check to see if accounts are available
	let account = await browserDependencies.getPrimaryAccount()
	// ugh, the browser is being a dick and now we have to do some horrible things to figure out why
	if (account === undefined) {
		if (window.ethereum !== undefined && 'enable' in window.ethereum && window.ethereum.enable !== undefined) {
			await window.ethereum.enable()
		} else {
			try {
				await browserDependencies.request('eth_requestAccounts', [])
			} catch (error) {
				// swallow the error and in doing so burn away a little more of Micah's soul
			}
		}
	}
	account = await browserDependencies.getPrimaryAccount()
	if (account === undefined) throw new Error(`Unable to access any user accounts.`)
	return account
}
