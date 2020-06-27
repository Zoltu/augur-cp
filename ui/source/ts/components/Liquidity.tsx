import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { attoToString, stringToAtto } from '../library/big-number-utilities'

export interface LiquidityModel {
	pool: AsyncProperty<{
		supply: bigint
		yes: bigint
		no: bigint
		invalid: bigint
		dai: bigint
	}>
	user: {
		connect: () => void
	} | AsyncProperty<{
		refresh: () => void
		addLiquidity: (attoshares: bigint) => void
		mintDai: (attodai: bigint) => void
		approveDai: () => void
		poolBalance: bigint
		daiBalance: bigint
		daiApproved: boolean
	}>
}

export function Liquidity(model: LiquidityModel) {
	return <div>
		<h1>Liquidity</h1>
		<h3>Pool Assets</h3>
		<PoolStatus { ...model.pool } />
		<h3>Your Assets</h3>
		<UserActions { ...model.user } />
	</div>
}

function PoolStatus(model: LiquidityModel['pool']) {
	switch (model.state) {
		case 'pending':
			return <div>'⌛'</div>
		case 'rejected':
			return <div>`🚨: ${model.error.message}`</div>
		case 'resolved':
			return <div>
				<div>Pool Supply: {attoToString(model.value.supply)}</div>
				<div>Pool Yes: {attoToString(model.value.yes)}</div>
				<div>Pool No: {attoToString(model.value.no)}</div>
				<div>Pool Invalid: {attoToString(model.value.invalid)}</div>
				<div>Pool DAI: {attoToString(model.value.dai)}</div>
			</div>
	}
}

function UserActions(model: LiquidityModel['user']) {
	if ('connect' in model) {
		return <div>
			Connect your account to add to the pool: <button onClick={model.connect}>Connect</button>
		</div>
	} else {
		switch (model.state) {
			case 'pending':
				return <div>Loading your pool contributions...</div>
			case 'rejected':
				return <div>Error loading your pool contributions: {model.error.message}</div>
			case 'resolved':
				return <div>
					<AddLiquidity addLiquidity={model.value.addLiquidity} approveDai={model.value.approveDai} poolBalance={model.value.poolBalance} daiApproved={model.value.daiApproved} />
					<MintDai mintDai={model.value.mintDai} daiBalance={model.value.daiBalance} />
				</div>
		}
	}
}

interface AddLiquidityModel {
	addLiquidity: (attoshares: bigint) => void
	approveDai: () => void
	poolBalance: bigint
	daiApproved: boolean
}
function AddLiquidity(model: AddLiquidityModel) {
	const [amountString, setAmountString] = React.useState('')
	const attosharesToBuy = /^\d+(?:\.\d+)?$/.test(amountString) ? stringToAtto(amountString) / 100n : 0n

	if (model.daiApproved) {
		return <div>
			<div>Pool Balance: {attoToString(model.poolBalance)}</div>
			<div>
				<input placeholder='dai to add to pool' type='number' onChange={event => setAmountString(event.target.value)} value={amountString} />
				<button disabled={attosharesToBuy === 0n} onClick={() => model.addLiquidity(attosharesToBuy)}>Add</button>
			</div>
		</div>
	} else {
		return <div>
			Let Augur Constant Product access your DAI: <button onClick={model.approveDai}>Approve</button>
		</div>
	}
}

interface MintDaiModel {
	mintDai: (attodai: bigint) => void
	daiBalance: bigint
}
function MintDai(model: MintDaiModel) {
	const [amountString, setAmountString] = React.useState('')
	const attodaiToMint = /^\d+(?:\.\d+)?$/.test(amountString) ? stringToAtto(amountString) : 0n

	return <div>
		<div>DAI Balance: {attoToString(model.daiBalance)}</div>
		<div>
			<input placeholder='amount to mint' type='number' onChange={event => setAmountString(event.target.value)} value={amountString} />
			<button disabled={attodaiToMint === 0n} onClick={() => model.mintDai(attodaiToMint)}>Mint</button>
		</div>
	</div>
}
