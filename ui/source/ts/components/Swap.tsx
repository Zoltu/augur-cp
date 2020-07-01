import * as React from 'react'
import { decimalStringToBigint } from '../library/big-number-utilities'

type Token = 'yes' | 'no' | 'dai'
export interface SwapModel {
	swap: (inputToken: Token, inputAmount: bigint, outputToken: Token) => void
}

export function Swap(model: SwapModel) {
	const [inputAmountString, setInputAmountString] = React.useState('')
	// const outputAmount = /^\d+(?:\.\d+)?$/.test(outputAmountString) ? stringToAtto(outputAmountString) : 0n
	const [selectedInput, setSelectedInput] = React.useState<Token>('dai')
	const [selectedOutput, setSelectedOutput] = React.useState<Token>('yes')

	const inputAmount = /^\d+(?:\.\d+)?$/.test(inputAmountString) ? decimalStringToBigint(inputAmountString, selectedInput === 'dai' ? 18 : 16) : 0n

	function switchInputAndOutput() {
		setInputAmountString('')
		setSelectedInput(selectedOutput)
		setSelectedOutput(selectedInput)
	}

	return <div>
		<h1 style={{ textAlign: 'center' }}>Swap</h1>
		<div style={{ textAlign: 'center' }}>
			<input type='number' value={inputAmountString} onChange={event => setInputAmountString(event.target.value)}/>
			<select value={selectedInput} onChange={event => setSelectedInput(event.target.value as Token)}>
				<option value='dai' hidden={selectedOutput === 'dai'}>DAI</option>
				<option value='yes' hidden={selectedOutput === 'yes'}>YES</option>
				<option value='no' hidden={selectedOutput === 'no'}>NO</option>
			</select>
			<button onClick={switchInputAndOutput}> ➡ </button>
			<select value={selectedOutput} onChange={event => setSelectedOutput(event.target.value as Token)}>
				<option value='dai' hidden={selectedInput === 'dai'}>DAI</option>
				<option value='yes' hidden={selectedInput === 'yes'}>YES</option>
				<option value='no' hidden={selectedInput === 'no'}>NO</option>
			</select>
		</div>
		<div style={{ textAlign: 'center' }}>
			<button onClick={() => model.swap(selectedInput, inputAmount, selectedOutput)}>Swap</button>
		</div>
	</div>
}
