import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { FetchJsonRpc, FetchDependencies } from '@zoltu/solidity-typescript-generator-fetch-dependencies'
import { BrowserDependencies } from '@zoltu/solidity-typescript-generator-browser-dependencies'
import { createOnChangeProxy } from './library/proxy'
import { asyncStateOnce } from './library/react-utilities'
import { AugurConstantProduct } from './generated/augur-constant-product'
import { AppModel, App } from './components/App'

const jsonRpcAddress = 'http://localhost:1237'
const rpc = new FetchJsonRpc(jsonRpcAddress, window.fetch.bind(window), {})
const fetchDependencies = new FetchDependencies(rpc)
const browserDependencies = new BrowserDependencies(fetchDependencies, {})
const augurConstantProduct = new AugurConstantProduct(browserDependencies, 0x0a1fa200fed2d6842426c46172e7ae6c4bdfbe61n)

async function main() {
	// create our root model as a proxy object that will auto-rerender anytime its properties (recursively) change
	const rootModel = createOnChangeProxy<AppModel>(render, {
		symbol: asyncStateOnce(augurConstantProduct.symbol_, symbol => { rootModel.symbol = symbol }),
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
