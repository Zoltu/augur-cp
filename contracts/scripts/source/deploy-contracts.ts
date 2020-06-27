import { Crypto } from '@peculiar/webcrypto'
(global as any).crypto = new Crypto()

import { deploy } from './deploy-contract'
import { createMemoryRpc } from './rpc-factories'

const jsonRpcEndpoint = 'http://localhost:1237'
const gasPrice = 1n * 10n**9n

async function main() {
	const rpc = await createMemoryRpc(jsonRpcEndpoint, gasPrice)
	const augurConstantProductAddress = await deploy(rpc, 'AugurConstantProduct.sol', 'AugurConstantProduct')
	console.log(augurConstantProductAddress.toString(16).padStart(40, '0'))
}

main().then(() => {
	process.exit(0)
}).catch(error => {
	console.error(error)
	process.exit(1)
})
