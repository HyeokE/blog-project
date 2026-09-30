// Fixture-only class concatenation: no Tailwind conflict resolution is needed
// for the pointer-selection regression. Production continues using its cn package.
export const cn=(...values)=>values.flat(Infinity).filter(value=>typeof value==='string'&&value).join(' ');
