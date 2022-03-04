/*!
 * WikiLambda Vue editor: Application store mutations
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
module.exports = exports = {
	setExpertMode: function ( state, value ) {
		state.expertMode = value;
		mw.storage.set( 'aw-expert-mode', value );
	},
	setI18n: function ( state, value ) {
		state.i18n = value;
	}
};
