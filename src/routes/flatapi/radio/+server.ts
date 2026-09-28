import { json } from '@sveltejs/kit';

import { getRadios } from '$lib/server/repos/radio';
import { PUBLIC_HOST } from '$env/static/public';

export function GET() {
	const radios = getRadios();

	return json(
		radios.map((radio) => {
			return {
				id: radio.id,
				title: radio.title,
				url: PUBLIC_HOST + '/flatapi/radio/' + radio.id + '/episodes'
			};
		})
	);
}
