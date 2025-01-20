/*!
 * WikiLambda Vue editor: Pinia store for frontend user rights and privileges
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	state: {
		/**
		 * Array of user rights or null if not initialized
		 */
		userRights: null
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
			return ( right ) => state.userRights !== null ? state.userRights.includes( right ) : undefined;
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
		 * @return {boolean}
		 */
		userCanRunFunction: function () {
			return this.userHasRight( 'wikilambda-execute' );
		},

		/**
		 * Returns whether the user can execute unsaved code
		 *
		 * @return {boolean}
		 */
		userCanRunUnsavedCode: function () {
			return this.userHasRight( 'wikilambda-execute-unsaved-code' );
		},

		/**
		 * Returns whether the user can edit type
		 *
		 * @return {boolean}
		 */
		userCanEditTypes: function () {
			return this.userHasRight( 'wikilambda-edit-type' );
		}
	},

	actions: {
		/**
		 * Fetch the user rights from mw.user.getRights and
		 * store them in the state
		 */
		fetchUserRights: function () {
			mw.user.getRights().then( ( rights ) => {
				this.userRights = rights;
			} );
		}
	}
};
