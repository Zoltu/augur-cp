import * as path from 'path'
import { promises as fs } from 'fs'
import { recursiveDirectoryCopy } from '@zoltu/file-copier'

const dependencyPaths = [
	// @pika/react is just react packaged for ES, so we just map 'react' to it at runtime
	{ packageName: 'es-module-shims', targetName: undefined, subfolder: 'dist', entrypoint: 'es-module-shims.min.js' },
	{ packageName: '@pika/react', targetName: 'react', subfolder: '', entrypoint: 'source.development.js' },
	{ packageName: '@pika/react-dom', targetName: 'react-dom', subfolder: '', entrypoint: 'source.development.js' },
	{ packageName: '@zoltu/ethereum-abi-encoder', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
	{ packageName: '@zoltu/solidity-typescript-generator-fetch-dependencies', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
	{ packageName: '@zoltu/solidity-typescript-generator-browser-dependencies', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
	{ packageName: '@zoltu/ethereum-crypto', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
	{ packageName: '@zoltu/ethereum-fetch-json-rpc', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
	{ packageName: '@zoltu/ethereum-types', targetName: undefined, subfolder: 'output-es', entrypoint: 'index.js' },
] as const

const indexFilePath = path.join(__dirname, '..', 'source', 'index.html')
const nodeModuleRoot = path.join(__dirname, '..', 'node_modules')
const vendorDestination = path.join(__dirname, '..', 'source', 'vendor')

async function vendorDependencies() {
	for (const { packageName, targetName, subfolder} of dependencyPaths) {
		const sourceDirectoryPath = path.join(nodeModuleRoot, packageName, subfolder)
		const destinationDirectoryPath = path.join(vendorDestination, path.normalize(targetName || packageName))
		await recursiveDirectoryCopy(sourceDirectoryPath, destinationDirectoryPath, undefined, fixSourceMap)
	}

	const indexHtmlPath = path.join(indexFilePath)
	const oldIndexHtml = await fs.readFile(indexHtmlPath, 'utf8')
	const importmap = dependencyPaths.reduce((importmap, {packageName, targetName, entrypoint }) => {
		importmap.imports[targetName || packageName ] = `./${path.join('.', 'vendor', targetName || packageName, entrypoint).replace(/\\/g, '/')}`
		return importmap
	}, { imports: {} as Record<string, string> })
	const importmapJson = JSON.stringify(importmap, undefined, '\t')
		.replace(/^/mg, '\t\t')
	const newIndexHtml = oldIndexHtml.replace(/<script type='importmap-shim'>[\s\S]*?<\/script>/m, `<script type='importmap-shim'>\n${importmapJson}\n\t</script>`)
	await fs.writeFile(indexHtmlPath, newIndexHtml)
}

// https://bugs.chromium.org/p/chromium/issues/detail?id=979000
async function fixSourceMap(filePath: string) {
	const fileExtension = path.extname(filePath)
	if (fileExtension !== '.map') return
	const fileDirectoryName = path.basename(path.dirname(path.dirname(filePath)))
	const fileName = path.parse(path.parse(filePath).name).name
	const fileContents = JSON.parse(await fs.readFile(filePath, 'utf-8')) as { sources: Array<string> }
	for (let i = 0; i < fileContents.sources.length; ++i) {
		fileContents.sources[i] = (fileName === 'index')
			? `./${fileDirectoryName}.ts`
			: `./${fileName}.ts`
	}
	await fs.writeFile(filePath, JSON.stringify(fileContents))
}

if (require.main === module) {
	vendorDependencies().catch(error => {
		console.error(error.message)
		console.error(error)
		process.exit(1)
	})
}
