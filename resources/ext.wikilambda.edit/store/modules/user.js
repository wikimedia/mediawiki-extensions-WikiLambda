/*!
 * WikiLambda Vue editor: Store module for frontend user rights and privileges
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
	state: {
		/**
		 * Array of user rights or null if not initialized
		 */
		userRights: null
	},
	actions: {
		/**
		 * Fetch the user rights from mw.user.getRights and
		 * store them in the state
		 *
		 * @param {Object} context
		 */
		fetchUserRights: function ( context ) {
			mw.user.getRights().then( ( rights ) => {
				context.commit( 'setUserRights', rights );
			} );
		}
	},
	mutations: {
		/**
		 * Store the collection of user rights in the state
		 *
		 * @param {Object} state
		 * @param {Array} rights
		 */
		setUserRights: function ( state, rights ) {
			state.userRights = rights;
		}
	},
	getters: {
		/**
		 * Returns whether the current user has the given
		 * right, or undefined if state is not yet initialized.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		userHasRight: function ( state ) {
			function hasRight( right ) {
				return ( state.userRights !== null ) ?
					state.userRights.includes( right ) :
					undefined;
			}
			return hasRight;
		},
		/**
		 * Returns whether the user is logged in
		 *
		 * @return {boolean}
		 */
		isUserLoggedIn: function () {
			return !!mw.config.values.wgUserName;
		},
		/**
		 * Returns whether the user can execute functions
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {boolean}
		 */
		userCanRunFunction: function ( _state, getters ) {
			return getters.userHasRight( 'wikilambda-execute' );
		},
		/**
		 * Returns whether the user can execute unsaved code
		 *
		 * @param {Object} _state
		 * @param {Object} getters
		 * @return {boolean}
		 */
		userCanRunUnsavedCode: function ( _state, getters ) {
			return getters.userHasRight( 'wikilambda-execute-unsaved-code' );
		}
	}
};
