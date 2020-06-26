import * as React from 'react'
import { AsyncProperty } from '../library/react-utilities'

export interface AppModel {
	symbol: AsyncProperty<string>
}

export function App(model: AppModel) {
	return <div>
		<div>{
				model.symbol.state === 'pending' ? 'Fetching symbol...'
				: model.symbol.state === 'rejected' ? `Error: ${model.symbol.error.message}`
				: model.symbol.value
			}
		</div>
	</div>
}
