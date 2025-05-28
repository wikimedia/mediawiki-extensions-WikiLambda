/*!
 * WikiLambda unit test suite helper for URLS
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const buildUrl = ( path, params ) => {
	const searchParams = new URLSearchParams( params );
	const queryString = searchParams.toString();
	const baseUrl = 'http://localhost';
	const fullPath = queryString ? `${ path }?${ queryString }` : path;
	return `${ baseUrl }${ fullPath }`;
};

module.exports = {
	buildUrl
};
