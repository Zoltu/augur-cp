import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { attoToString, bigintToDecimalString } from '../library/big-number-utilities'

export interface StatsModel {
	readonly pool: AsyncProperty<{
		readonly supply: bigint
		readonly dai: bigint
		readonly yes: bigint
		readonly no: bigint
		readonly invalid: bigint
	}>
	user: {
		readonly connect: () => void
	} | AsyncProperty<{
		readonly pool: bigint
		readonly dai: bigint
		readonly yes: bigint
		readonly no: bigint
		readonly invalid: bigint
		readonly daiApproved: boolean
		readonly shareApproved: boolean
	}>
	readonly mintDai: () => void
	readonly approveDai: () => void
	readonly approveShareToken: () => void
}

export function Stats(model: StatsModel) {
	return <div>
		<h1 style={{ textAlign: 'center' }}>Stats</h1>
		<div style={{ display:'flex', gap: '25px' }}>
			<div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
				<h2>Pool Stats</h2>
				<PoolStats {...model.pool} />
			</div>
			<div style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
				<h2>User Stats</h2>
				<UserStats {...model.user} mintDai={model.mintDai} approveDai={model.approveDai} approveShareToken={model.approveShareToken} />
			</div>
		</div>
	</div>
}

function PoolStats(model: StatsModel['pool']) {
	switch (model.state) {
		case 'pending':
			return <div>Loading pool stats...</div>
		case 'rejected':
			return <div>Error loading pool stats: {model.error.message}</div>
		case 'resolved':
			return <div>
				<button onClick={model.refresh}>Refresh</button>
				<div>Supply: {attoToString(model.value.supply)}</div>
				<div>DAI: {attoToString(model.value.dai)}</div>
				<div>Yes: {bigintToDecimalString(model.value.yes, 16n)}</div>
				<div>No: {bigintToDecimalString(model.value.no, 16n)}</div>
				<div>Invalid: {bigintToDecimalString(model.value.invalid, 16n)}</div>
			</div>
	}
}

function UserStats(model: StatsModel['user'] & { mintDai: () => void, approveDai: () => void, approveShareToken: () => void }) {
	if ('connect' in model) {
		return <div>
			<button onClick={model.connect}>Connect to Ethereum Browser</button>
		</div>
	} else {
		switch (model.state) {
			case 'pending':
				return <div>Loading pool stats...</div>
			case 'rejected':
				return <div>Error loading pool stats: {model.error.message}</div>
			case 'resolved':
				return <div>
					<button onClick={model.refresh}>Refresh</button>
					<div>Pool: {attoToString(model.value.pool)}</div>
					<div>DAI: {attoToString(model.value.dai)}<button onClick={model.approveDai} hidden={model.value.daiApproved}>Approve</button><button onClick={model.mintDai}>Mint</button></div>
					<div>Yes: {bigintToDecimalString(model.value.yes, 16n)}<button onClick={model.approveShareToken} hidden={model.value.shareApproved}>Approve</button></div>
					<div>No: {bigintToDecimalString(model.value.no, 16n)}<button onClick={model.approveShareToken} hidden={model.value.shareApproved}>Approve</button></div>
					<div>Invalid: {bigintToDecimalString(model.value.invalid, 16n)}<button onClick={model.approveShareToken} hidden={model.value.shareApproved}>Approve</button></div>
				</div>
		}
	}
}
