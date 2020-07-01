import * as React from 'react'
import { stringToAtto, decimalStringToBigint } from '../library/big-number-utilities'

export interface LiquidityModel {
	readonly addLiquidity: (attoshares: bigint) => void
	readonly removeLiquidity: (attoshares: bigint) => void
}

export function Liquidity(model: LiquidityModel) {
	function AddLiquidity({ style }: { style?: React.CSSProperties }) {
		const [amountString, setAmountString] = React.useState('')
		const sharesToBuy = /^\d+(?:\.\d+)?$/.test(amountString) ? decimalStringToBigint(amountString, 16) : 0n

		return <div style={style}>
			<input placeholder='dai to add to pool' type='number' onChange={event => setAmountString(event.target.value)} value={amountString} />
			<button disabled={sharesToBuy === 0n} onClick={() => model.addLiquidity(sharesToBuy)}>Add</button>
		</div>
	}

	function RemoveLiquidity({ style }: { style?: React.CSSProperties }) {
		const [amountString, setAmountString] = React.useState('')
		const poolToRedeem = /^\d+(?:\.\d+)?$/.test(amountString) ? stringToAtto(amountString) : 0n

		return <div style={style}>
			<input placeholder='pool tokens to redeem' type='number' onChange={event => setAmountString(event.target.value)} value={amountString} />
			<button disabled={poolToRedeem === 0n} onClick={() => model.removeLiquidity(poolToRedeem)}>Remove</button>
		</div>
	}

	return <div>
		<h1 style={{ textAlign: 'center' }}>Liquidity</h1>
		<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			<AddLiquidity style={{ flexBasis: 0, flexGrow: 1, flexShrink: 1 }} />
			<RemoveLiquidity style={{ flexBasis: 0, flexGrow: 1, flexShrink: 1 }} />
		</div>
	</div>
}
