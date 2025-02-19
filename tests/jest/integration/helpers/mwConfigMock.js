/*!
 * WikiLambda unit test suite function editor helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const mockMWConfigGet = ( configVars ) => {
	const config = Object.assign( {
		wgWikiLambda: {
			createNewPage: true,
			runFunction: false,
			viewmode: false,
			zlang: 'en',
			zlangZid: 'Z1002',
			zId: 'Z0',
			title: '',
			page: ''
		},
		wgExtensionAssetsPath: '/w/extensions',
		wgWikifunctionsBaseUrl: null,
		wgUserLanguage: 'en',
		wgPageContentLanguage: 'en'
	}, configVars );

	return ( configVar ) => ( config[ configVar ] || null );
};

module.exports = exports = mockMWConfigGet;
