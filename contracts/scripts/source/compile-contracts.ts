import { promises as filesystem } from 'fs'
import * as path from 'path'
import { CompilerOutput, CompilerInput, compile } from 'solc'
import { generateContractInterfaces } from '@zoltu/solidity-typescript-generator'

const outputFileNamePrefix = 'augur-constant-product'
const sourceFiles = [
	'AugurConstantProduct.sol',
	'AugurMock.sol',
	'DaiMock.sol',
	'@openzeppelin/contracts/token/ERC20/IERC20.sol',
	'@openzeppelin/contracts/token/ERC20/ERC20.sol',
	'@openzeppelin/contracts/GSN/Context.sol',
	'@openzeppelin/contracts/math/SafeMath.sol',
	'@openzeppelin/contracts/utils/Address.sol',
]
const destinationRootPaths = path.join(__dirname, '..', '..', '..', 'ui', 'source', 'ts', 'generated')

export async function ensureDirectoryExists(absoluteDirectoryPath: string) {
	try {
		await filesystem.mkdir(absoluteDirectoryPath)
	} catch (error) {
		if (error.code === 'EEXIST') return
		throw error
	}
}

function resolveRelativeContractPath(fileName: string) {
	if (fileName.startsWith('@')) {
		return path.join(__dirname, '..', '..', 'node_modules', path.normalize(fileName))
	} else {
		return path.join(__dirname, '..', '..', 'source', path.normalize(fileName))
	}
}

async function compileContracts(): Promise<[CompilerInput, CompilerOutput]> {
	let sources: Record<string, { content: string }> = {}
	for (const sourceFile of sourceFiles) {
		const absolutePath = resolveRelativeContractPath(sourceFile)
		const content = await filesystem.readFile(absolutePath, 'utf8')
		sources[sourceFile] = { content }
	}

	const compilerInput: CompilerInput = {
		language: "Solidity",
		settings: {
			optimizer: {
				enabled: true,
				runs: 500
			},
			debug: {
				revertStrings: "debug",
			},
			outputSelection: {
				"*": {
					'*': [ 'abi', 'storageLayout', 'metadata', 'evm.bytecode.object', 'evm.bytecode.sourceMap', 'evm.deployedBytecode.object', 'evm.gasEstimates', 'evm.methodIdentifiers' ]
				}
			}
		},
		sources
	}

	const compilerInputJson = JSON.stringify(compilerInput)
	const compilerOutputJson = compile(compilerInputJson)
	const compilerOutput = JSON.parse(compilerOutputJson) as CompilerOutput
	const errors = compilerOutput.errors
	if (errors) {
		let concatenatedErrors = "";

		for (let error of errors) {
			if (error.message === 'SPDX license identifier not provided in source file. Before publishing, consider adding a comment containing "SPDX-License-Identifier: <SPDX-License>" to each source file. Use "SPDX-License-Identifier: UNLICENSED" for non-open-source code. Please see https://spdx.org for more information.') continue
			concatenatedErrors += error.formattedMessage + "\n";
		}

		if (concatenatedErrors.length > 0) {
			throw new Error("The following errors/warnings were returned by solc:\n\n" + concatenatedErrors);
		}
	}

	return [compilerInput, compilerOutput]
}

async function writeCompilerInput(input: CompilerInput) {
	await ensureDirectoryExists(destinationRootPaths)
	const filePath = path.join(destinationRootPaths, `${outputFileNamePrefix}-input.json`)
	const fileContents = JSON.stringify(input, undefined, '\t')
	return await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeCompilerOutput(output: CompilerOutput) {
	await ensureDirectoryExists(destinationRootPaths)
	const filePath = path.join(destinationRootPaths, `${outputFileNamePrefix}-output.json`)
	const fileContents = JSON.stringify(output, undefined, '\t')
	return await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function writeGeneratedInterface(compilerOutput: CompilerOutput, filename: string) {
	const filePath = path.join(destinationRootPaths, `${filename}.ts`)
	await ensureDirectoryExists(path.dirname(filePath))
	const fileContents = await generateContractInterfaces(compilerOutput)
	await filesystem.writeFile(filePath, fileContents, { encoding: 'utf8', flag: 'w' })
}

async function main() {
	const [compilerInput, compilerOutput] = await compileContracts()
	await writeCompilerInput(compilerInput)
	await writeCompilerOutput(compilerOutput)
	await writeGeneratedInterface(compilerOutput, outputFileNamePrefix)
}

main().then(() => {
	process.exit(0)
}).catch(error => {
	console.error(error)
	process.exit(1)
})
