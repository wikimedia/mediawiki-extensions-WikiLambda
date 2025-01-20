/*!
 * WikiLambda Vue editor: Application store router (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

module.exports = {
	state: {
		currentPath: mw.Uri().path,
		currentView: Constants.VIEWS.Z_OBJECT_VIEWER,
		queryParams: mw.Uri().query
	},

	getters: {
		getCurrentView: function ( state ) {
			return state.currentView;
		},
		getQueryParams: function ( state ) {
			return state.queryParams;
		},
		getViewMode: function () {
			const editingData = mw.config.get( 'wgWikiLambda' );
			return editingData.viewmode;
		}
	},

	actions: {
		/**
		 * Changes the current View and Query params and updates the history state.
		 *
		 * @param {Object} payload
		 * @param {string} payload.to - Target view.
		 * @param {Object} [payload.params] - Additional query parameters.
		 */
		navigate: function ( payload ) {
			/**
			 * Whether the given URI path string is a known view in Constants.VIEWS
			 *
			 * @param {string} view
			 * @return {boolean}
			 */
			const viewIsInvalid = function ( view ) {
				let viewExist = false;
				Object.keys( Constants.VIEWS ).forEach( ( viewKey ) => {
					if ( Constants.VIEWS[ viewKey ] === view ) {
						viewExist = true;
					}
				} );
				return !viewExist;
			};
			if ( viewIsInvalid( payload.to ) ) {
				return;
			}

			this.currentView = payload.to;

			if ( payload.params ) {
				this.queryParams = Object.assign( {}, this.queryParams, payload.params );
			}

			const path = this.currentPath;
			const query = Object.assign( {}, this.queryParams, { view: this.currentView } );
			const newUriString = `${ path }?${ $.param( query ) }`;

			window.history.pushState( { path, query }, null, newUriString );
		},

		/**
		 * Evaluate the Uri path and determine what View should be displayed.
		 */
		evaluateUri: function () {
			const uri = mw.Uri();

			// Set title if URL is in `/wiki/{{ title }}` format
			if ( !uri.query.title && uri.path.includes( '/wiki' ) ) {
				const lastPathIndex = uri.path.lastIndexOf( '/' );
				uri.query.title = uri.path.slice( lastPathIndex + 1 );
			}

			/**
			 * Whether the URL is to Special Create ZObject page
			 *
			 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
			 * @return {boolean}
			 */
			const isCreatePath = ( uriQuery ) => uriQuery.title === Constants.PATHS.CREATE_OBJECT_TITLE;

			// 1. if Special page Create
			if ( isCreatePath( uri.query ) ) {
				// I we have zid=Z8 in the uri, render function edit view
				// Else, render default view
				this.changeCurrentView(
					uri.query.zid === Constants.Z_FUNCTION ?
						Constants.VIEWS.FUNCTION_EDITOR :
						Constants.VIEWS.DEFAULT
				);
				return;
			}

			/**
			 * Whether the URL is to Special Evaluate Function Call page
			 *
			 * @param {Object} uriQuery The contextual mw.Uri's query sub-object
			 * @return {boolean}
			 */
			const isEvaluateFunctionCallPath = ( uriQuery ) => uriQuery.title === Constants.PATHS.RUN_FUNCTION_TITLE;

			// 2. if Special page Run Function
			if ( isEvaluateFunctionCallPath( uri.query ) ) {
				this.changeCurrentView( Constants.VIEWS.FUNCTION_EVALUATOR );
				return;
			}

			/**
			 * Whether the Root ZObject presented in the view or edit page is a Z8/Function
			 *
			 * @param {Object} objectContext The ZObject context in which we're operating
			 * @return {boolean}
			 */
			const isFunctionRootObject = () => this.getCurrentZObjectType === Constants.Z_FUNCTION;

			// 3. if Function page (edit or view)
			if ( isFunctionRootObject() ) {
				this.changeCurrentView(
					this.getViewMode ?
						Constants.VIEWS.FUNCTION_VIEWER :
						Constants.VIEWS.FUNCTION_EDITOR
				);
				return;
			}

			// 4. Default view
			this.changeCurrentView( Constants.VIEWS.DEFAULT );
		},

		/**
		 * Handle the changes of a view and replace the history state.
		 *
		 * @param {string} view - The new view to set.
		 */
		changeCurrentView: function ( view ) {
			this.currentView = view;

			const uri = mw.Uri();

			// should only replace history state if path query view is set and is different from new view
			if ( uri.query.view && uri.query.view !== view ) {
				const path = uri.path;
				const query = Object.assign( {}, uri.query, { view: view } );
				const newUriString = `${ path }?${ $.param( query ) }`;

				window.history.replaceState( { path, query }, null, newUriString );
			}
		}
	}
};
