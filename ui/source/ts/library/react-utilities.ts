export type Pending = { state: 'pending' }
export type Resolved<T> = { state: 'resolved', value: T }
export type Rejected = { state: 'rejected', error: Error }
export type AsyncProperty<T> = Pending | Resolved<T> | Rejected
export type StripAsyncProperty<T extends AsyncProperty<unknown>> = T extends Resolved<infer U> ? U : never

export function asyncState<T>(resolver: () => Promise<T>, assigner: (future: Pending | Resolved<T> | Rejected) => void) {
	return () => {
		assigner({ state: 'pending' })
		resolver()
			.then(value => assigner({ state: 'resolved', value }))
			.catch(error => assigner({ state: 'rejected', error }))
	}
}

export function asyncStateOnce<T>(resolver: () => Promise<T>, assigner: (future: Pending | Resolved<T> | Rejected) => void) {
	resolver()
		.then(value => assigner({ state: 'resolved', value }))
		.catch(error => assigner({ state: 'rejected', error }))
	return { state: 'pending' } as const
}
