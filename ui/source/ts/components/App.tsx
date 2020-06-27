import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { Liquidity } from './Liquidity'

export interface AppModel {
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

export function App(model: AppModel) {
	return <div>
		<Liquidity pool={model.pool} user={model.user} />
	</div>
}
