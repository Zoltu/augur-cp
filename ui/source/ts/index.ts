import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { BrowserDependencies } from '@zoltu/solidity-typescript-generator-browser-dependencies'
import { createOnChangeProxy } from './library/proxy'
import { asyncState } from './library/react-utilities'
import { AugurConstantProduct, ShareToken, Dai } from './generated/augur-constant-product'
import { AppModel, App } from './components/App'

const jsonRpcAddress = 'http://localhost:1237'
const rpc = new FetchJsonRpc(jsonRpcAddress, window.fetch.bind(window), {})
const fetchDependencies = new FetchDependencies(rpc)
const browserDependencies = new BrowserDependencies(fetchDependencies, {})
const augurConstantProduct = new AugurConstantProduct(browserDependencies, 0xf87011df54bcf742f97f2048120ea5309fd53132n)
const marketAddress = 0x0n
const INVALID = 0n
const NO = 1n
const YES = 2n

async function main() {
	// TODO: start rendering the page before waiting for this
	const shareToken = new ShareToken(browserDependencies, await augurConstantProduct.shareToken_())
	const dai = new Dai(browserDependencies, await augurConstantProduct.dai_())
	// TODO: calculate these in TS, no need for round trips to get them
	const yesTokenId = await shareToken.getTokenId_(marketAddress, YES)
	const noTokenId = await shareToken.getTokenId_(marketAddress, NO)
	const invalidTokenId = await shareToken.getTokenId_(marketAddress, INVALID)

	// create our root model as a proxy object that will auto-rerender anytime its properties (recursively) change
	const rootModel = createOnChangeProxy<AppModel>(render, {
		pool: { state: 'pending' },
		user: { connect: () => updateUser() },
	})

	async function connectToEthereumBrowser() {
		// handle non-ethereum-browser scenario better
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

	// setup our state updaters
	const updatePool = asyncState(async () => {
		const supply = await augurConstantProduct.totalSupply_()
		const yes = await shareToken.balanceOf_(augurConstantProduct.address, yesTokenId)
		const no = await shareToken.balanceOf_(augurConstantProduct.address, noTokenId)
		const invalid = await shareToken.balanceOf_(augurConstantProduct.address, invalidTokenId)
		const daiBalance = await dai.balanceOf_(augurConstantProduct.address)
		return { supply, yes, no, invalid, dai: daiBalance }
	}, pool => rootModel.pool = pool)

	const updateUser = asyncState(async () => {
		if (!browserDependencies.isEthereumBrowser()) throw new Error(`Need an Ethereum enabled browser`)
		const account = await connectToEthereumBrowser()
		return {
			refresh: () => updateUser(),
			addLiquidity: (attoshares: bigint) => augurConstantProduct.addLiquidity(attoshares).then(updateUser).then(updatePool).catch(console.error),
			mintDai: (attodai: bigint) => dai.mint(attodai).then(updateUser).catch(console.error),
			approveDai: () => dai.approve(augurConstantProduct.address, 2n**256n - 1n).then(updateUser).catch(console.error),
			poolBalance: await augurConstantProduct.balanceOf_(account),
			daiBalance: await dai.balanceOf_(account),
			daiApproved: await dai.allowance_(account, augurConstantProduct.address) !== 0n
		}
	}, user => { rootModel.user = user })

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

	// kick off initial state update
	updatePool()
}
main().catch(console.error)
