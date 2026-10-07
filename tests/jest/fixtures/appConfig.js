/*!
 * WikiLambda unit test suite: stand-in for the virtual ext.wikilambda.app/config.json
 * ResourceLoader file, which does not exist on disk.
 *
 * The values are the defaults from extension.json. A test that needs a different
 * editor can change them, and must restore them afterwards.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	WikiLambdaUseCodeMirror: true
};
