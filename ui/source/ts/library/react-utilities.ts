export type Pending = { state: 'pending' }
export type Resolved<T> = { state: 'resolved', value: T }
export type Rejected = { state: 'rejected', error: Error }
export type AsyncProperty<T> = { readonly refresh: () => void} & (Pending | Resolved<T> | Rejected)
export type StripAsyncProperty<T extends AsyncProperty<unknown>> = T extends Resolved<infer U> ? U : never

export function refreshableAsyncState<T>(renderer: () => void, resolver: () => Promise<T>): AsyncProperty<T> {
	const result = {
		refresh: () => {
			resolver().then(value => {
				result.state = 'resolved'
				;(result as Resolved<T>).value = value
			}).catch(error => {
				result.state = 'rejected'
				;(result as Rejected).error = error
			}).then(renderer)
		},
		state: 'pending'
	} as AsyncProperty<T>
	result.refresh()
	return result
}
