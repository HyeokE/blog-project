import {notFound} from 'next/navigation';

// Unmatched /craft/** URLs would otherwise fall through to the root (Korean, blog) 404.
// Throwing here renders src/app/craft/not-found.tsx inside the Craft layout instead.
export default function CraftMissing(){notFound()}
