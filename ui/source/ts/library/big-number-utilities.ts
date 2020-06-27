export function bigintToDecimalString(value: bigint, power: bigint): string {
	const integerPart = value / 10n**power
	const fractionalPart = value % 10n**power
	if (fractionalPart === 0n) {
		return integerPart.toString(10)
	} else {
		return `${integerPart.toString(10)}.${fractionalPart.toString(10).padStart(Number(power), '0').replace(/0+$/, '')}`
	}
}

export function attoToString(value: bigint): string {
	return bigintToDecimalString(value, 18n)
}

export function stringToAtto(value: string): bigint {
	return decimalStringToBigint(value, 18)
}

export function decimalStringToBigint(value: string, power: number): bigint {
	if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error(`Value is not a decimal string.`)
	let [integerPart, fractionalPart] = value.split('.')
	fractionalPart = (fractionalPart || '').padEnd(power, '0')
	return BigInt(`${integerPart}${fractionalPart}`)
}
