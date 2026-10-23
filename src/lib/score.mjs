/**
 * menagerie lib — star-whore repo scoring (pure; used by rank-repos + tests)
 * Weights are judgment calls, kept in one place so tests pin them down.
 */
export function scoreRepo({ name = '', description = '', readme = '', stars = 0, hasCII = false, topics = [] } = {}) {
	let s = 0;
	const readmeText = (readme || '').toLowerCase();
	const descText = `${name} ${description}`.toLowerCase();

	// naming: one word, lowercase-friendly, no version numbers
	if (/^[a-z][a-z0-9-]{2,30}$/.test(name)) s += 10;
	if (/\d/.test(name)) s -= 5;
	if (name.length <= 8) s += 5;

	// README-max signals
	if (readmeText.includes('badge') || /!\[[^\]]*\]\(https?:\/\/img\.shields\.io/.test(readmeText)) s += 5;
	if (readmeText.includes('quick start') || readmeText.includes('getting started')) s += 5;
	if (readmeText.includes('license')) s += 3;
	if (readmeText.includes('contributing')) s += 2;
	if (readmeText.includes('```')) s += 3;

	// skill/estate markers
	for (const t of ['skill', 'agent', 'mcp', 'cli']) if (topics.includes(t) || descText.includes(t)) s += 2;

	if (stars >= 1000) s += 15;
	else if (stars >= 100) s += 10;
	else if (stars >= 10) s += 5;
	else s += stars >= 1 ? 2 : 0;
	if (hasCII) s += 3;
	return Math.min(100, Math.max(0, s));
}
