/*!
 * WikiLambda Vue editor: Application store mutations
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
module.exports = {
	setExpertMode: function ( state, value ) {
		state.expertMode = value;
		localStorage.setItem( 'aw-expert-mode', value );
	}
};
