import CraftError from '@/components/craft/CraftError';

// Renders inside the Craft layout for notFound() under /craft, including unmatched /craft/** paths ([...missing]).
export default function CraftNotFound(){return <CraftError status="404"/>}
