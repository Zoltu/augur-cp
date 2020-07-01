import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'
import { Liquidity } from './Liquidity'
import { Stats } from './Stats'
import { Swap, SwapModel } from './Swap'

export interface AppModel {
	pool: AsyncProperty<{
		supply: bigint
		dai: bigint
		yes: bigint
		no: bigint
		invalid: bigint
	}>
	user: {
		connect: () => void
	} | AsyncProperty<{
		pool: bigint
		dai: bigint
		yes: bigint
		no: bigint
		invalid: bigint
		daiApproved: boolean
		shareApproved: boolean
	}>
	addLiquidity: (shares: bigint) => void
	removeLiquidity: (poolTokens: bigint) => void
	swap: SwapModel['swap']
	mintDai: () => void
	approveDai: () => void
	approveShareToken: () => void
}

export function App(model: AppModel) {
	return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', whiteSpace: 'nowrap' }}>
		{/* TODO: don't be lazy and actually pass into Stats only the state that it actually needs, rather than just dumping the whole thing and hoping the names line up */}
		<Stats pool={model.pool} user={model.user} mintDai={model.mintDai} approveDai={model.approveDai} approveShareToken={model.approveShareToken} />
		<Liquidity addLiquidity={model.addLiquidity} removeLiquidity={model.removeLiquidity} />
		<Swap swap={model.swap} />
	</div>
}
